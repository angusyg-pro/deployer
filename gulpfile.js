const gulp = require('gulp');
const del = require('del');
const pump = require('pump');
const plugins = require('gulp-load-plugins')();
const gutil = require('gulp-util');
const uglify = require('gulp-uglify-es').default;
const runSequence = require('run-sequence');

const libJs = [
  'node_modules/angular/angular.min.js',
  'node_modules/angular-animate/angular-animate.min.js',
  'node_modules/angular-sanitize/angular-sanitize.min.js',
  'node_modules/@uirouter/angularjs/release/angular-ui-router.min.js',
  'node_modules/ui-bootstrap4/dist/ui-bootstrap-tpls.js',
  'node_modules/ng-file-upload/dist/ng-file-upload.min.js',
  'node_modules/ng-toast/dist/ngToast.min.js',
  'node_modules/socket.io-client/dist/socket.io.js',
];
const localJs = [
  'client/src/app/app.module.js',
  'client/src/app/**/*.module.js',
  'client/src/app/**/*.js',
];
const sourceJs = libJs.concat(localJs);
const libSass = [];
const localSass = [
  'client/src/scss/**/*.scss',
];
const sassEntryFile = ['client/src/scss/style.scss'];
const sourceSass = libSass.concat(localSass);
const sourceHtml = ['client/src/html/**/*'];
const sourceAssets = ['client/src/assets/**/*'];
const dest = 'client/dist';
const destinationJs = `${dest}/js`;
const destinationCss = `${dest}/stylesheets`;
const destinationHtml = `${dest}`;
const destinationAssets = `${dest}/assets`;
const finalJs = 'frontend.js';
const cleanDest = [`${dest}`];
const cleanJs = [`${destinationJs}`];
const cleanCss = [`${destinationCss}`];
const cleanHtml = [
  `${destinationHtml}/**/*.html`,
  `${destinationHtml}/partials`
];
const cleanAssets = [`${destinationAssets}`];
const isProduction = (process.env.NODE_ENV === 'production');
const pumpPromise = streams => new Promise((resolve, reject) => {
  pump(streams, (err) => {
    if (err) {
      gutil.log(gutil.colors.red('[Error]'), err.toString());
      reject(err);
    } else resolve();
  });
});

// Removes js
gulp.task('clean-js', () => del(cleanJs));

// Removes css
gulp.task('clean-css', () => del(cleanCss));

// Removes html
gulp.task('clean-html', () => del(cleanHtml));

// Removes assets
gulp.task('clean-assets', () => del(cleanAssets));

// Removes all static files
gulp.task('clean', callback => runSequence('clean-js', 'clean-css', 'clean-html', 'clean-assets', callback));

// Creates css from sass files and reload in dev mode
gulp.task('css', () => pumpPromise([
  gulp.src(sassEntryFile),
  plugins.sass(),
  plugins.cleanCss(),
  gulp.dest(destinationCss),
  plugins.if(!isProduction, plugins.connect.reload()),
]));

// Copies js lib
gulp.task('lib-js', () => pumpPromise([
  plugins.if(!isProduction, gulp.src(libJs)),
  plugins.if(!isProduction, gulp.dest(destinationJs)),
]));

// Copies and minifies if necessary js files and reloads in dev mode
gulp.task('js', () => pumpPromise([
  gulp.src((isProduction ? sourceJs : localJs)),
  plugins.concat(finalJs),
  gulp.dest(destinationJs),
  plugins.if(isProduction, uglify({ mangle: false })),
  plugins.if(isProduction, plugins.rename({ suffix: '.min' })),
  plugins.if(isProduction, gulp.dest(destinationJs)),
  plugins.if(!isProduction, plugins.connect.reload()),
]));

// Copies and replaces in html js import if production mode and reloads in dev mode
gulp.task('html', () => pumpPromise([
  gulp.src(sourceHtml),
  plugins.if(isProduction, plugins.htmlReplace({ js: '/js/frontend.min.js' })),
  gulp.dest(destinationHtml),
  plugins.if(!isProduction, plugins.connect.reload()),
]));

// Copies images and reloads in dev mode
gulp.task('assets', () => pumpPromise([
  gulp.src(sourceAssets),
  gulp.dest(destinationAssets),
  plugins.if(!isProduction, plugins.connect.reload()),
]));

// Creates connect server for dev mode
gulp.task('connect', () => {
  if (!isProduction) {
    plugins.connect.server({
      root: ['client/dist', 'node_modules'],
      livereload: true,
    });
  }
});

// Watches files for reload in dev mode
gulp.task('watch', () => {
  if (!isProduction) {
    gulp.watch(sourceSass, ['css']);
    gulp.watch(sourceJs, ['js']);
    gulp.watch(sourceHtml, ['html']);
    gulp.watch(sourceAssets, ['assets']);
  }
});

// Default task
gulp.task('default', callback => runSequence('clean', ['html', 'assets', 'css', 'lib-js', 'js'], 'connect', 'watch', callback));
gulp.task('postinstall', ['default']);
