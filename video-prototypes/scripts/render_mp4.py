#!/usr/bin/env python3
import numpy as np, imageio.v2 as imageio
from render_scene6 import render_frame, N, FPS, W, H

# MP4 (h264) - plays inline everywhere
writer = imageio.get_writer("/tmp/szene-06.mp4", fps=FPS, codec="libx264",
                            quality=8, macro_block_size=2, ffmpeg_params=["-pix_fmt","yuv420p"])
stills = {30:"a_hook", 110:"b_loop", 130:"c_snap", 168:"d_grey", 230:"e_wink"}
for i in range(N):
    im = render_frame(i)
    writer.append_data(np.asarray(im.convert("RGB")))
    if i in stills:
        im.convert("RGB").save(f"/tmp/still_{stills[i]}.png")
writer.close()
print("done -> /tmp/szene-06.mp4 + stills")
