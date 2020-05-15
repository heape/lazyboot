// list ofreferences
https://electronjs.org/docs/tutorial/installation
https://github.com/electron-userland/electron-packager
https://electronjs.org/docs
https://v8docs.nodesource.com/node-4.8/

// run
electron .


// build source code
node-gyp configure
node-gyp build

// packager
electron-packager . lazyboot --platform=win32 --arch=ia32 --app-version=4.0.3

// x64
.\node_modules\.bin\electron-rebuild.cmd --force node-gyp rebuild --target=4.0.3 --arch=x64
electron-packager . lazyboot --platform=win32 --arch=x64 --app-version=4.0.3 --overwrite


