#!/usr/bin/env fab
# -*- coding: utf-8 -*-
"Deploy Bundle Tasks"

from fabric.api import *
from fabric.colors import white, blue, cyan, green, yellow, red, magenta

from util import *


@task(default=True)
@expand_env
def bundle_all():
    """ Bundles vendor and application files.
    """
    update_version()
    collapse_trees()
    bundle_vendor()
    bundle_app()

@task
@expand_env
@msg('Collapsing Serve Trees')
def collapse_trees():
    """ Collapse the serve trees into one directory.
    """
    update_version()
    
    # Ensure clean dist directory
    env.work_dir.rmtree(ignore_errors=True)
    env.work_dir.makedirs()
    
    # XXX: Unfortunately, we can't use rsync_project() for local-to-local copies, as it insists on
    # inserting a : before the remote path, which indicates a local-to-remote copy. :(
    
    # Copy the static files, derived files, and the whole data directory (bc lack of trailing /)
    # into dist. Note that you will need to load all the site pages in your browser to populate var
    # with the derived files.
    local('rsync -Ca static/ var/ data %(work_dir)s/' % env)
    
    # We copy lib (which contains .co source files) to src to make it easy to link source content
    # to each other. Finding it in gitweb is a pain. Finding it in gerrit is almost impossible.
    # But this could go away when we move to github.
    local('rsync -Ca lib/ %(work_dir)s/src/' % env)
    
    # For some reason, the shell tool does not generate a file identical to the middleware. So whatever.
    # We curl here because we know that version works.
    # local('browserify -o %(work_dir)s/%(browserify_js)s -r events -r seq' % env)
    with env.work_browserify_js.open('w') as f:
        f.write( local('curl --silent --fail --url http://%(dev_server)s/%(browserify_js)s' % env, capture=True) )

@task
@expand_env
@msg('Building Vendor Bundle')
def bundle_vendor():
    """ Bundles vendor files.
    """
    update_version()
    with env.vendor_bundle.open('w') as vendor_bundle:
        
        for js in local('coke source_list | grep vendor', capture=True).split('\n'):
            try:
                # Search for matching vendor file as it might be derived (.mod.js)
                vendor_file = ( d/js for d in env.vendor_search_dirs if (d/js).exists() ).next()
            except StopIteration:
                abort("Unable to locate vendor file '%s'!" % js)
            vendor_bundle.write("\n;\n")
            with vendor_file.open() as f:
                vendor_bundle.write(f.read())
        
        vendor_bundle.write('\n')

@task
@expand_env
@msg('Building App Bundle')
def bundle_app():
    """ Bundles and minifies app files.
    """
    update_version()
    # XXX: Meh. Maybe this should become python code.
    local('cat $(coke source_list | grep -v vendor | sed "s/^/var\//") > %(app_bundle)s' % env)
    # Run the minify command, adding npm's bin directory
    with path('node_modules/.bin'):
        local('%(minify_cmd)s %(app_bundle)s > %(app_bundle_min)s' % env)



