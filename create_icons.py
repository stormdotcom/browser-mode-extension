import struct, zlib, math, os

def write_png(path, w, h, pixels):
    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.extend(pixels[y * w + x])
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', zlib.compress(bytes(raw), 9)))
        f.write(chunk(b'IEND', b''))

def in_rrect(cx, cy, s, pad, r):
    if cx < pad or cx > s - pad or cy < pad or cy > s - pad:
        return False
    if cx < pad + r and cy < pad + r:
        return math.hypot(cx - (pad + r), cy - (pad + r)) <= r
    if cx > s - pad - r and cy < pad + r:
        return math.hypot(cx - (s - pad - r), cy - (pad + r)) <= r
    if cx > s - pad - r and cy > s - pad - r:
        return math.hypot(cx - (s - pad - r), cy - (s - pad - r)) <= r
    if cx < pad + r and cy > s - pad - r:
        return math.hypot(cx - (pad + r), cy - (s - pad - r)) <= r
    return True

def pip(px, py, poly):
    inside = False
    j = len(poly) - 1
    for i, (xi, yi) in enumerate(poly):
        xj, yj = poly[j]
        if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

def lerp(a, b, t):
    return int(max(0, min(255, a + (b - a) * t)))

def render(size):
    pad = size * 0.05
    r = size * 0.22
    SS = 4  # supersampling factor

    # Bold lightning bolt — wider and taller for clarity
    bolt_norm = [
        (0.67, 0.07),  # top-right
        (0.30, 0.54),  # mid-left (notch bottom)
        (0.58, 0.54),  # mid-right (notch bottom)
        (0.33, 0.93),  # bottom tip
        (0.70, 0.46),  # mid-right (notch top)
        (0.42, 0.46),  # mid-left (notch top)
    ]
    bolt      = [(x * size, y * size) for x, y in bolt_norm]
    # shadow bolt shifted down-right slightly
    shadow_off = max(1, size * 0.03)
    bolt_shad = [(x + shadow_off, y + shadow_off) for x, y in bolt]

    # Deep indigo → vivid purple gradient
    c1 = (55, 48, 200)
    c2 = (124, 28, 212)

    pixels = []
    for y in range(size):
        for x in range(size):
            # Accumulate subpixel samples
            bg_r = bg_g = bg_b = bg_a = 0
            shad = white = total = 0

            for sy in range(SS):
                for sx in range(SS):
                    cx = x + (sx + 0.5) / SS
                    cy = y + (sy + 0.5) / SS
                    total += 1

                    if not in_rrect(cx, cy, size, pad, r):
                        continue

                    t = (cx / size + cy / size) / 2.0
                    rr = lerp(c1[0], c2[0], t)
                    gg = lerp(c1[1], c2[1], t)
                    bb = lerp(c1[2], c2[2], t)
                    hl = int(max(0, (1.0 - (cx + cy) / (size * 0.85)) * 35))
                    rr = min(255, rr + hl)
                    gg = min(255, gg + hl)
                    bb = min(255, bb + hl)

                    bg_r += rr; bg_g += gg; bg_b += bb; bg_a += 1
                    if pip(cx, cy, bolt_shad):
                        shad += 1
                    if pip(cx, cy, bolt):
                        white += 1

            if bg_a == 0:
                pixels.append((0, 0, 0, 0))
                continue

            rr = bg_r // bg_a
            gg = bg_g // bg_a
            bb = bg_b // bg_a

            # blend shadow (dark overlay)
            sf = shad / (SS * SS)
            rr = int(rr * (1 - sf * 0.45))
            gg = int(gg * (1 - sf * 0.45))
            bb = int(bb * (1 - sf * 0.45))

            # blend white bolt
            wf = white / (SS * SS)
            rr = int(rr + (255 - rr) * wf)
            gg = int(gg + (255 - gg) * wf)
            bb = int(bb + (255 - bb) * wf)

            alpha = int(255 * bg_a / (SS * SS))
            pixels.append((rr, gg, bb, alpha))
    return pixels

os.makedirs('images', exist_ok=True)
for s in [128, 48, 16]:
    write_png(f'images/icon{s}.png', s, s, render(s))
    print(f'  images/icon{s}.png  ({s}x{s})')
print('Done.')
