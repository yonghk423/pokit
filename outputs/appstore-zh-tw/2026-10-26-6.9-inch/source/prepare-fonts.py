"""Select the Traditional Chinese faces from macOS font collections for local rendering.

Temporary font copies are never included in the deliverable or ZIP files.
"""
from pathlib import Path
import struct
import sys


def extract(source, face_index, destination):
    data = Path(source).read_bytes()
    offset = struct.unpack_from('>I', data, 12 + face_index * 4)[0]
    count = struct.unpack_from('>H', data, offset + 4)[0]
    header = data[offset:offset + 12]
    tables = []
    for i in range(count):
        tag, checksum, start, length = struct.unpack_from('>4sIII', data, offset + 12 + i * 16)
        content = bytearray(data[start:start + length])
        if tag == b'head':
            content[8:12] = bytes(4)
        padded = content + bytes((-length) % 4)
        checksum = sum(struct.unpack('>' + 'I' * (len(padded) // 4), padded)) & 0xffffffff
        tables.append((tag, checksum, length, padded))
    output = bytearray(header)
    cursor = 12 + count * 16
    head = None
    for tag, checksum, length, content in tables:
        output += struct.pack('>4sIII', tag, checksum, cursor, length)
        if tag == b'head':
            head = cursor
        cursor += len(content)
    for _, _, _, content in tables:
        output += content
    checksum = sum(struct.unpack('>' + 'I' * (len(output) // 4), output)) & 0xffffffff
    struct.pack_into('>I', output, head + 8, (0xB1B0AFBA - checksum) & 0xffffffff)
    destination.write_bytes(output)


target = Path(sys.argv[1])
target.mkdir(parents=True, exist_ok=True)
extract('/System/Library/Fonts/Supplemental/Songti.ttc', 7, target / 'TraditionalSerif.ttf')
extract('/System/Library/Fonts/STHeiti Medium.ttc', 0, target / 'TraditionalUI.ttf')
