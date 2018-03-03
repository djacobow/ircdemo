import datetime

def nowstr():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()
