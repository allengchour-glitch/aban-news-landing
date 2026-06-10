import struct
def _vlq(n):
    b=[n&0x7f]; n>>=7
    while n: b.append((n&0x7f)|0x80); n>>=7
    return bytes(reversed(b))
def write_midi(path, tracks, tpq=480, tempo_bpm=120):
    # tracks: list of event-lists; each event = (tick, status, data1, data2) sorted later
    # plus meta tempo on track 0
    out=b'MThd'+struct.pack('>IHHH',6,1,len(tracks),tpq)
    for ti,evs in enumerate(tracks):
        ev=list(evs)
        body=b''
        if ti==0:
            mpqn=int(60_000_000/tempo_bpm)
            body+=b'\x00'+b'\xff\x51\x03'+struct.pack('>I',mpqn)[1:]
        ev.sort(key=lambda e:(e[0], 0 if (e[1]&0xf0)==0x80 else 1))  # note-offs first at same tick
        last=0
        for tick,status,d1,d2 in ev:
            body+=_vlq(tick-last)
            if status>=0xC0 and status<0xE0:  # program change: 1 data byte
                body+=bytes([status,d1])
            else:
                body+=bytes([status,d1,d2])
            last=tick
        body+=b'\x00\xff\x2f\x00'
        out+=b'MTrk'+struct.pack('>I',len(body))+body
    open(path,'wb').write(path and out)
def notes_track(notes, program=None, channel=0):
    # notes: list of (start_tick, dur_tick, pitch, vel)
    ev=[]
    if program is not None: ev.append((0,0xC0|channel,program,0))
    for st,du,p,v in notes:
        ev.append((st,0x90|channel,p,v))
        ev.append((st+du,0x80|channel,p,0))
    return ev
