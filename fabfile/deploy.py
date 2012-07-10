#!/usr/bin/env fab
# -*- coding: utf-8 -*-
"Deploy Tasks"

from fabric.api import *
from fabric.colors import white, blue, cyan, green, yellow, red, magenta
from fabric.contrib.files import exists
from fabric.contrib.project import rsync_project

from stages import ensure_stage
from util import *



@task(default=True)
@expand_env
@ensure_stage
def deploy_and_update():
    """ Deploy the project.
    """
    fix_permissions()
    update_branch()
    sync_files()
    fix_permissions()
    restart_node()

@task
@expand_env
@ensure_stage
@msg('Fixing Permissions')
def fix_permissions(user=None, group=None):
    """ Recursively fixes permissions on the deployment host.
    """
    if user  is None: user  = env.owner
    if group is None: group = env.group
    sudo('chmod -R g+w %(target_dir)s' % env)
    sudo('chown -R %s:%s %s' % (user, group, env.target_dir))

@task
@expand_env
@ensure_stage
@msg('Cloning Origin')
def clone():
    """ Clones source on deployment host if not present.
    """
    if exists(env.target_dir): return
    with cd(env.target_dir.dirname()):
        run('git clone %(git_origin)s' % env)

@task
@expand_env
@ensure_stage
def checkout():
    """ Checks out proper branch on deployment host.
    """
    # TODO: Locally saved data files will cause yelling?
    with cd(env.target_dir):
        run('git fetch --all')
        opts = {'track' : '--track' if env.git_branch not in branches() else ''}
        opts.update(env)
        run('git checkout %(track)s origin/%(git_branch)s' % opts)

@task
@expand_env
@ensure_stage
@msg('Updating Branch')
def update_branch():
    """ Runs git pull on the deployment host.
    """
    with cd(env.target_dir):
        execute(checkout)
        run('git pull origin %(git_branch)s' % env)
        run('npm install')

@task
@expand_env
@ensure_stage
@msg('Syncing Files')
def sync_files():
    """ Copies `dist` package to deployment host.
    """
    local("rsync -Crz -v %(work_dir)s %(user)s@%(host)s:%(target_dir)s/" % env)
    # TODO: make sure the following works.
    # rsync_project(local_dir=env.work_dir, remote_dir="%(user)s@%(host)s:%(target_dir)s/" % env)
    
    # Remove derived files to ensure they get regenerated
    run('rm -rf %(target_dir)s/var' % env)

@task
@expand_env
@ensure_stage
@msg('Restarting Node.js')
def restart_node():
    """ Restarts node.js server on the deployment host.
    """
    sudo("supervisorctl restart %(supervisor_job)s" % env)


