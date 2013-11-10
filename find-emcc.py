#!/usr/bin/python
import os
exec(open(os.path.expanduser("~/.emscripten")).read())
print(EMSCRIPTEN_ROOT)
