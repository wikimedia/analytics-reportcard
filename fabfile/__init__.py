#!/usr/bin/env fab
# -*- coding: utf-8 -*-
"Limn Deployer"

import sys
from functools import wraps


# Deal with the fact that we aren't *really* a Python project,
# so we haven't declared python dependencies.
try:
    # To build this project using fabric, you'll need to install fabric (and some other stuff)
    from fabric.api import *
    from path import path as p # renamed to avoid conflict w/ fabric.api.path
    # Dep for the crazy SSH Proxy Gateway monkeypatch
    import paramiko
except ImportError:
    print """ 
        ERROR: You're missing a dependency!
        To build this project using fabric, you'll need to install fabric (and some other stuff):
            
            pip install -U Fabric paramiko path.py
        """
    sys.exit(1)

# My mind is blown. This totally works.
# see: https://github.com/fabric/fabric/issues/38#issuecomment-5608014
import monkeypatch_sshproxy
from util import *



### Fabric Config

# TODO: env.rcfile = 'fabfile/fabricrc.conf'

# We use `defaults()` here so --set on the commandline will override.
defaults(env, dict(
    project_name       = 'Limn',
    colors             = True,
    use_ssh_config     = True,
    
    git_origin         = 'git@less.ly:kraken-ui.git',
    dev_server         = 'localhost:8081',
    minify_cmd         = 'uglifyjs',
    
    supervisor_job     = 'reportcard',
    
    ### Paths
    dist               = 'dist',
    local_tmp          = 'tmp',
    work_dir           = '%(local_tmp)s/%(dist)s',
    
    browserify_js      = 'vendor/browserify.js',
    work_browserify_js = '%(work_dir)s/%(browserify_js)s',
    
    vendor_search_dirs = ['static', 'var', '%(work_dir)s'],
    vendor_bundle      = '%(work_dir)s/vendor/vendor-bundle.min.js',
    app_bundle         = '%(work_dir)s/js/kraken/app-bundle.js',
))

env_paths = (
    'dist', 'local_tmp', 'work_dir', 
    'browserify_js', 'work_browserify_js',
    'vendor_bundle', 'app_bundle',
)
for k in env_paths:
    env[k] = p(env[k])

env.vendor_search_dirs = [ expand(p(vd)) for vd in env.vendor_search_dirs ]
env.app_bundle_min     = p(env.app_bundle.replace('.js', '.min.js'))



### Setup Staging Environments

# Envs aren't declared with @task in the stages module so that we can
# decorate them here and have them show up at the top level.
import stages

for name in stages.STAGE_NAMES:
    globals()[name] = task(getattr(stages, name))



### Project Tasks

import bundle
import deploy

@task(default=True)
@stages.prompt_for_stage
def full_deploy():
    """ Bundles and deploys the project. [Default]
    """
    bundle.bundle_all()
    deploy.deploy_and_update()


