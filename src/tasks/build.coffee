class module.exports.Build
  copy: require 'directory-copy'
  cp: require 'cp'
  path: require 'path'
  exec: require('child_process').exec
  phonegapCmd: require('./phonegapCmd').cmd

  constructor: (@grunt, @config) ->
    @file = @grunt.file
    @log = @grunt.log
    @warn = @grunt.warn
    @fatal = @grunt.fatal

  clean: (path = @config.path) ->
    if @file.exists(path) then @file.delete(path)
    @

  buildTree: ->
    path = @config.path
    @file.mkdir @path.join(path, 'plugins')
    @file.mkdir @path.join(path, 'platforms')
    @file.mkdir @path.join(path, 'merges', 'android')
    @file.mkdir @path.join(path, 'www')
    @file.mkdir @path.join(path, '.cordova')
    @

  cloneCordova: (fn) =>
    @copy src: @config.cordova, dest: @path.join(@config.path, '.cordova'), (err) =>
      @warn(err) if err
      fn(err) if fn

  cloneRoot: (fn) =>
    @copy src: @config.root, dest: @path.join(@config.path, 'www'), (err) =>
      @warn(err) if err
      fn(err) if fn

  compileConfig: (fn) =>
    dest = @path.join(@config.path, 'www', 'config.xml')
    if @grunt.util.kindOf(@config.config) == 'string'
      @log.writeln "Copying static #{@config.config}"
      @cp @config.config, dest, -> fn()
    else
      @log.writeln "Compiling template #{@config.config.template}"
      template = @grunt.file.read @config.config.template
      compiled = @grunt.template.process template, data: @config.config.data
      @grunt.file.write dest, compiled
      fn()

  addPlugin: (plugin, fn) =>
    cmd = "#{@phonegapCmd} plugin add #{plugin} #{@_setVerbosity()}"
    console.log("Running: [#{cmd}]")
    proc = @exec cmd, {
      cwd: @config.path,
      maxBuffer: @config.maxBuffer * 1024
    }, (err, stdout, stderr) =>
      @fatal err if err
      fn(err) if fn

    proc.stdout.on 'data', (out) => @log.write(out)
    proc.stderr.on 'data', (err) => @fatal(err)

  postProcessPlatform: (platform, fn) =>
    switch platform
      when 'android'
        @_fixAndroidVersionCode()
    fn() if fn


  buildPlatform: (platform, fn) =>
    cmd = "#{@phonegapCmd} build #{platform} #{@_setVerbosity()}"
    childProcess = @exec cmd, {
      cwd: @config.path,
      maxBuffer: @config.maxBuffer * 1024
    }, (err, stdout, stderr) =>
      @fatal err if err
      fn(err) if fn

    childProcess.stdout.on 'data', (out) => @log.write(out)
    childProcess.stderr.on 'data', (err) => @fatal(err)

  buildIcons: (platform, fn) =>
    if @config.icons
      switch platform
        when 'android'
          @buildAndroidIcons(@config.icons)
        else
          @warn "You have set `phonegap.config.icons`, but #{platform} does not support it. Skipped..."
    else
      @log.writeln "No `phonegap.config.icons` specified. Skipped."
    fn() if fn

  buildAndroidIcons: (icons) ->
    res = @path.join @config.path, 'platforms', 'android', 'res'
    best = null

    if icons['ldpi']
      best = icons['ldpi']
      @file.copy icons['ldpi'], @path.join(res, 'drawable-ldpi', 'icon.png'), encoding: null

    if icons['mdpi']
      best = icons['mdpi']
      @file.copy icons['mdpi'], @path.join(res, 'drawable-mdpi', 'icon.png'), encoding: null

    if icons['hdpi']
      best = icons['hdpi']
      @file.copy icons['hdpi'], @path.join(res, 'drawable-hdpi', 'icon.png'), encoding: null

    if icons['xhdpi']
      best = icons['xhdpi']
      @file.copy icons['xhdpi'], @path.join(res, 'drawable-xhdpi', 'icon.png'), encoding: null

    if best
      @file.copy best, @path.join(res, 'drawable', 'icon.png'), encoding: null

  _setVerbosity: ->
    if @config.verbose then '-V' else ''

  _fixAndroidVersionCode: =>
    dom = require('xmldom').DOMParser
    data = @config.versionCode
    versionCode = if @grunt.util.kindOf(data) == 'function' then data() else data

    manifestPath = @path.join @config.path, 'platforms', 'android', 'AndroidManifest.xml'
    manifest = @grunt.file.read manifestPath
    doc = new dom().parseFromString manifest, 'text/xml'
    doc.getElementsByTagName('manifest')[0].setAttribute('android:versionCode', versionCode)
    @grunt.file.write manifestPath, doc
