#!/usr/bin/env python3

import time
import io
import base64
import picamera
from skimage.measure import compare_ssim as ssim
import numpy as np
from PIL import Image
import myhelpers

class Camera():
    def __init__(self):
        self.last_idata = None
        self.average_sameness = None
        self.trailing_average_sameness = None 
        self.camera = picamera.PiCamera()

    def setParams(self,cfg):
        self.config = cfg

    # It would be much better if this returned the serial number of the camera, not the computer
    def getSerial(self):
        cpuserial = "0000000000000000"
        try:
            with open('/proc/cpuinfo','r') as fh:
                for line in fh:
                    if line[0:6]=='Serial':
                        cpuserial = line[10:26]
        except:
            cpuserial = "ERROR000000000"
        return cpuserial

    # fast capture and no analysis
    def captureToJPEGStr(self):
        print('captureToJPEGStr()')
        stream = io.BytesIO()
        camera = self.camera
        for param in self.config['params']:
            setattr(camera,param,self.config['params'][param])
        self.last_cap = myhelpers.nowstr()
        camera.capture(stream,'jpeg')
        stream.seek(0)
        rv = {
            'taken': self.last_cap,
            'image_jpeg': base64.b64encode(stream.getvalue()).decode('utf-8'),
        }
        return rv



    def captureToBytesRGB(self):
        stream = None
        image = None

        if True:
        #with picamera.PiCamera() as camera:
            camera = self.camera
            for param in self.config['params']:
                setattr(camera,param,self.config['params'][param])
            stream = io.BytesIO()
            # if the camera object was just created, it needs time
            # for its eyes to adjust to light level. If it was already
            # open this is not necesssary.
            #time.sleep(1) 
            print('Capture image')
            self.last_cap = myhelpers.nowstr()
            camera.capture(stream, format='rgb')
            width = self.config['params']['resolution'][0]
            height = self.config['params']['resolution'][1]
            stream.seek(0)
            image = np.frombuffer(stream.getvalue(), dtype=np.uint8).reshape(height, width, 3)
            stream.seek(0)
        return {'npimage': image, 'stream': stream}
        

    def compareImages(self,i0,i1):
        # this basically resizes a 2d array, to make a pic smaller
        def rebin(a, shape):
            sh = shape[0],a.shape[0]//shape[0],shape[1],a.shape[1]//shape[1]
            return a.reshape(sh).mean(-1).mean(1)

        if not i0 or not i1:
            return None

        # convert to grayscale
        gs0 = np.mean(i0['npimage'], axis=2)
        gs1 = np.mean(i1['npimage'], axis=2)
        # shrink to make calc faster
        newshape = [ int(x/4) for x in gs0.shape ]

        sm0 = rebin(gs0,newshape)
        sm1 = rebin(gs1,newshape)

        s = ssim(sm0, sm1)
        return s


    def takeAndComparePhoto(self):
        try:
            idata = self.captureToBytesRGB()
            sameness = self.compareImages(idata, self.last_idata)

            do_upload = False

            if not self.config['skip_comparison'] and sameness is not None:
                if self.trailing_average_sameness is None:
                    self.trailing_average_sameness = sameness

                print('Sameness: {0}, Trailing: {1}'.format(str(sameness),str(self.trailing_average_sameness)))
            
                self.trailing_average_sameness += -0.1 * self.trailing_average_sameness + 0.1 * sameness
                res = None
                if sameness < 0.90 * self.trailing_average_sameness:
                    do_upload = True
            else:
                do_upload = True

            self.last_idata = idata

            if do_upload or self.config['skip_comparison']:
                return self.makeImgStr(idata)


        except Exception as e:
            print('well, that didn\'t work')
            print(e)

        return None


    def makeImgStr(self, img):
        pilimg = Image.fromarray(img['npimage'],'RGB')
        fstr   = io.BytesIO()
        pilimg.save(fstr,format='jpeg')
        fstr.seek(0)
        rv = {
            'taken': self.last_cap,
            'image_jpeg': base64.b64encode(fstr.getvalue()).decode('utf-8'),
        }
        return rv

if __name__ == '__main__':
    print('before init')
    c = Camera()
    c.setParams({'params':{}})
    print('after init')
    for i in range(4):
        c.captureToJPEGStr()
        print('after capture')

