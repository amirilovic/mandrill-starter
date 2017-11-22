const gulp = require('gulp');
const ejsMonster = require('gulp-ejs-monster');
const inlineCss = require('gulp-inline-css');
const sass = require('gulp-sass');
const sequence = require('gulp-sequence');
const path = require('path');
const each = require('gulp-each');
const Handlebars = require('handlebars');
const mandrillTemplates = require('gulp-mandrill-templates');
const del = require('del');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const fs = require("fs");
const livereload = require('gulp-livereload');


const ejsOptions = {
    showHistory: true,
    layouts: './src/layouts',
    delimiter: '%',
    localsName: 'locals',
};

const srcDir = './src';
const tmpDir = './.tmp';
const distDir = './dist';
const previewDir = './preview';

function readJson(filePath) {
    var content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
}

gulp.task('ejs', function () {
    return gulp.src(path.join(srcDir, '/templates/*.ejs'))
        .pipe(ejsMonster(ejsOptions).on('error', ejsMonster.preventCrash))
        .pipe(gulp.dest(tmpDir));
});

gulp.task('scss', function () {
    return gulp.src(path.join(srcDir, 'scss/*.scss'))
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(tmpDir));
});

gulp.task('inline-css', function () {
    return gulp.src(path.join(tmpDir, '*.html'))
        .pipe(inlineCss())
        .pipe(gulp.dest(distDir));
});

gulp.task('preview', ['clean:preview', 'build'], function () {
    return gulp.src(path.join(distDir, '*.html'))
        .pipe(each(function (content, file, callback) {
            const template = Handlebars.compile(content);
            const fileName = path.parse(file.path).name;
            const dataPath = './' + path.join(srcDir, 'data', fileName + '.json');
            const data = readJson(dataPath);
            callback(null, template(data));
        }))
        .pipe(gulp.dest(previewDir))
        .pipe(livereload());
});

gulp.task('clean:dist', function () {
    return del(['dist']);
});

gulp.task('clean:tmp', function () {
    return del(['.tmp']);
});

gulp.task('clean:preview', function () {
    return del(['preview']);
});

gulp.task('clean', ['clean:preview', 'clean:dist', 'clean:tmp']);

gulp.task('build', function (callback) {
    sequence('clean:dist', 'clean:tmp', 'ejs', 'scss', 'inline-css', 'clean:tmp')(callback);
});

gulp.task('publish', ['build'], function () {
    return gulp.src('dist/**/*.html')
        .pipe(mandrillTemplates({
            key: process.env.MANDRILL_KEY
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', function () {
    livereload.listen();
    watch('src/**/*.*', batch(function (events, done) {
        gulp.start('preview', done);
    }));
});