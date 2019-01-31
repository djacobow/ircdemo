import datetime
import time
import threading
import queue


# This class exists to run a series of tasks at intervals. Some of these
# tasks will generate data, which will then be processed by a worker
# thread, typically to send it over a network.
#
# The idea is that the timer loop is reasonably prompt and the functions
# called there return quickly, and the worker loop pops work off a queue
# left by the timer functions and then handles it at its own rate

MAX_Q_LEN = 5

class TimerWorkerLoop(object):
    def __init__(self):
        self.beginning_of_time = datetime.datetime.fromtimestamp(0)
        self.max_consec_exceptions = 5
        self.stop_worker = False

        now = datetime.datetime.now()

        self.q = queue.Queue()
        
        self.worker = {
            'handlers': {},
            'last_run': self.beginning_of_time,
            'loop_count': 0,
            'tick_len': 0.5,
        }

        self.timer = {
            'handlers': {},
            'loop_count': 0,
            'tick_len': 0.5,
        }


    def addWorker(self, name, func):
        self.__addHandler('worker',name,func,None)

    def addTimer(self, timer_name, timer_func, timer_period):
        self.__addHandler('timer',timer_name,timer_func,timer_period)

    def addSplitAction(self, name, timerfunc, workerfunc, timer_period):
        self.addTimer(name, timerfunc, timer_period)
        self.addWorker(name, workerfunc)

    def addTimedAction(self, name, worker_func, timer_period):
        def dummy(name, now):
            return name + '_placeholder'

        self.addTimer(name, dummy, timer_period)
        self.addWorker(name, worker_func)

    def submit(self, name, data):
        workitem = {
            'name': name,
            'data': data,
        }
        success = True
        try:
            self.q.put(workitem, block=False)
        except queue.Full:
            print("work queue full")
            success = False
        except Exception as e:
            print("other queue put exception")
            print(e)
            success = False

        return success

       
    def __addHandler(self, htype, name, func, period):
        if htype == 'worker':
            handler = self.worker['handlers'].get(name,None)
        elif htype == 'timer':
            handler = self.timer['handlers'].get(name,None)

        if handler is None:
            handler = {
                'last_run': self.beginning_of_time,
                'last_success': self.beginning_of_time,
            }

        handler['name'] = name
        handler['func'] = func
        handler['consec_exceptions'] = 0

        if period is not None:
            handler['period'] = datetime.timedelta(seconds=period)

        if htype == 'worker':
            self.worker['handlers'][name] = handler
        elif htype == 'timer':
            self.timer['handlers'][name] = handler
        else:
            raise Exception('do not recognize handler type')

    def __dispatch(self, workitem):
        now = datetime.datetime.now()
        if workitem:
            handler_name = workitem['name']
            if handler_name in self.worker['handlers']:
                handler_info = self.worker['handlers'][handler_name]
                handler_info['last_run'] = now
                rv = handler_info['func'](workitem['data'],now)
                if rv is None:
                    handler_info['last_success'] = now
            else:
                print('Error: no handler for type: {0}'.format(handler_name))


    def __timerTick(self):
        stop = False
        for name in self.timer['handlers']:
            now = datetime.datetime.now()
            handler = self.timer['handlers'].get(name,None)
            if handler is None:
                print("Missing handler for " + name)
            elif (now - handler['last_run']) > handler['period']:
                func = handler.get('func',None)
                if not func:
                    print("missing handler function for " + name)
                else:
                    try:
                        handler['last_run'] = now
                        data = func(name, now)
                        if data is not None:
                            self.submit(name,data)
                            handler['last_success'] = now
                            handler['consec_exceptions'] = 0
                    except Exception as e:
                        handler['consec_exceptions'] += 1
                        print(func)
                        print('Exception calling callback for ' + name)
                        print(e)
                        if handler['consec_exceptions'] > self.max_consec_exceptions:
                            print('Maximum handler exceptions exceeded. Stopping.')
                            stop = True

        self.timer['loop_count'] += 1
        return stop


    def __workerLoopWrap(self):
        while not self.stop_worker:
            workitem = None

            qlen = self.q.qsize()
            if qlen > MAX_Q_LEN:
                print("Why is this queue getting so long? Emptying")
                for i in range(qlen):
                    self.q.get(block=False)
            try:
                workitem = self.q.get(block=False)
            except queue.Empty:
                pass
            except Exception as e:
                print("other workerloop queue exception:")
                print(e)

            if workitem is not None:
                self.__dispatch(workitem)
            else:
                time.sleep(self.timer['tick_len'])

        print('Worker stopped')


    def startWorker(self):
        t = threading.Thread(target=self.__workerLoopWrap)
        t.start()
        self.worker['thread'] = t
        return t


    def __timerLoopWrap(self):
        running = True
        while running:
            stop = self.__timerTick()
            if stop is not None and stop is True:
                running = False
                self.stop_worker = True
            else:
                time.sleep(self.timer['tick_len'])
        print('TimerLoop stopped')


    def startTimers(self, createThread = False, tick_len = None):
        if tick_len is not None:
            self.timer['tick_len'] = tick_len

        if createThread:
            t = threading.Thread(target=self.__timerLoopWrap)
            t.start()
            self.timer['thread'] = t
            return t
        else:
            return self.__timerLoopWrap()

