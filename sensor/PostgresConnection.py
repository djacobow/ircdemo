#!/usr/bin/env python3

import psycopg2
import json

class PostgresConnection(object):
    def __init__(self, config):
        self.config = config
        dsn = 'dbname={} user={} password={} host={}'.format(*[ config[x] for x in ['dbname','user','password','host']])
        self.conn = psycopg2.connect(dsn)

    def push(self,item):

        qtext = """
        INSERT INTO raddata (
            time, 
            serial, 
            batteryTemperature, 
            temperature, 
            gain, 
            status, 
            batteryLevel, 
            lld_g, 
            lld_n, 
            integration_ms, 
            batteryChargeRate, 
            bias, 
            spectrum
        ) 
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        );
        """

        qvals = [
            item['read_time'],
            item['serial'],
            item['batteryTemperature'],
            item['temperature'],
            item['gain'],
            item['status'],
            item['batteryLevel'],
            item['lld-g'],
            item['lld-n'],
            item['time'],
            item['batteryChargeRate'],
            item['bias'],
            json.dumps(item['spectrum']),
        ]

        cur = self.conn.cursor()
        cur.execute(qtext, qvals)
        self.conn.commit()
        cur.close()

        return True


if __name__ == '__main__':
    cfg = {
        'dbname': 'raddemo',
        'user': 'postgres',
        'password': 'lalalalalalalalala',
        'host': 'ec2-34-220-91-92.us-west-2.compute.amazonaws.com',
    }
    pgconn = PostgresConnection(cfg)

