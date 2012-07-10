# labs notes

Just random stuff you might be interested in, as I work.


## sudoers NOPASSWD

My LDAP password is a jangly string of random characters. To avoid memorizing it (I use a password safe), I think we should add NOPASSWD to ourselves in `/etc/sudoers` under "# User privilege specification":

    dsc      ALL=(ALL) NOPASSWD: ALL
    otto     ALL=(ALL) NOPASSWD: ALL

These instances are disposable and our keys are secure enough imo, so I vote convenience > security.


## Installing node.js & other deps

I'd prefer to do it via package manager (https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) but the latest in the repo is 0.4.x and we need >=0.6.x. So source it is.

```sh
	sudo su -
	aptitude install build-essential libev-dev libssl-dev supervisor
	mkdir sources; cd sources
	
	# node.js
	wget http://nodejs.org/dist/v0.6.17/node-v0.6.17.tar.gz
	tar -xvf node-v0.6.17.tar.gz
	cd node-v0.6.17
	./configure && make && make install && make doc
	cd ..
```

Alternatively, as I believe a newer version of node is now in the a ppa repo:

```sh
	sudo su -
	aptitude install python-software-properties
	add-apt-repository ppa:chris-lea/node.js
	aptitude update
	aptitude install nodejs
```

Oh, except that the ancient WMF version overrides it. Sigh.

The rest of the instructions are the same.

```sh
	# npm
	curl http://npmjs.org/install.sh > npm-install.sh
	sh ./npm-install.sh
	
	# git
	aptitude install git-core gitdoc
	
	# coco, coffee (global)
	npm install -g coco coffee-script
	
	# give up root
	exit
```


## Kraken


```sh
	# I don't know why I can't mkdir when this is owned by `www-data:www` @ 775, and I'm in `www`
	sudo chown $USER:www /srv
	
	# reminder -- your user's publickey needs to be in my gitosis repo for this to work.
	###   you should NOT be root for this part   ###
	cd /srv && git clone git@less.ly:reportcard.git && cd reportcard
	mkdir logs
	npm install
	coke setup
	
	# ok, back to root to setup webservers
	sudo su -
	chown -R www-data:www /srv
	chmod -R g+w /srv
	
	# supervisord setup
	cp -f /srv/reportcard/msc/reportcard-supervisor.conf /etc/supervisor/conf.d/reportcard.conf
	supervisorctl update
	supervisorctl start reportcard
	
	# ...if using nginx
	cp -f /srv/reportcard/msc/reportcard.nginx /etc/nginx/sites-available/reportcard
	cd /etc/nginx/sites-enabled
	ln -sf ../sites-available/reportcard ./
	nginx -t && { nginx -s reload || nginx }
	
	# ...if using Apache
	cp -f /srv/reportcard/msc/reportcard.wmflabs.org.conf /etc/apache2/sites-available/reportcard
	cd /etc/apache2/sites-enabled
	ln -sf ../sites-available/reportcard ./
	cd ../../mods-enabled
	ln -sf ../mods-available/proxy* ../mods-available/rewrite* ./
	apache2ctl -t && { apache2ctl reload || apache2ctl start }
	
	exit
```

