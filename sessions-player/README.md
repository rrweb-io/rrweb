## installing node.js

if you can enter `npm` command into terminal and do not get a 'command not found' error then you should skip this section

You'll want to install node using `nvm` node version manager. This will allow you to easily switch between node versions and install/upgrade versions more seamlessly than other installation methods.

Follow the installation instructions here:

https://github.com/nvm-sh/nvm/blob/master/README.md#installation-and-update

Once that's installed, verified it worked: `nvm ls` you'll probably see a 'no node versions installed' message or similar

To install latest version:

`nvm ls-remote` will list all versions you can install chronologically. You just want to take note of the last one.

At time of writing this, v12.3.1 is the latest version, so you'd run `nvm install v12.3.1` to install.

You should be good to go! Now `node` and `npm` commands should work.

## Basic dev stuff

#### To install dependencies:

`$ npm install`

#### To run dev server:

`$ npm run start`

this will run a dev server on local which watches for changes
and automatically refreshes the ui when a change occurs

#### linking nferx-core-ui:

if you want to make changes to core-ui and test them within your app, you can do so using the `npm link` feature. Once linked, any changes to core-ui will cause your app server to restart allowing you to properly test/develop core-ui alongside your app.

First you'll need to `git clone` nferx-core-ui project onto your machine

then `cd` into your core-ui project

run `$ npm link`

then `cd` into your app project

run `$ npm link nferx-core-ui`

next time your run `npm start` you should see that any code changes to core-ui cause your app dev server to reload

## Setting up a new app for development on an nferx server, with pycharm:

#### cloning the nfer repo
you can skip this step if you already have an nfer repo on your laptop, it's up to you whether you use a single nfer repo for multiple projects, or multiple copies of nfer, one for each project you're developing.

`$ git clone https://github.com/lumenbiomics/nfer.git`

By default this will create a folder at `./nfer` you can provide a filepath if you'd like to change the folder name/location

eg. `$ git clone https://github.com/lumenbiomics/nfer.git my-project`

#### cloning ui-starter

the following steps assume you've `cd`'d into the root of the nfer repo you just cloned.

`$ cd nferxapps`

`$ git clone https://github.com/lumenbiomics/nferx-ui-starter.git APPNAME` replace APPNAME with whatever your app's name is

`cd APPNAME && rm -rf .git` **IMPORANT** do not forget this step - you must remove the starter-ui's git folder or git will not work properly

#### setting Config.js

Open src/Config.js

edit your `appName` and `homepage`

homepage will be the url that your app is accessed at eg. /signals or /clinical-trials

#### configuring pycharm

first open the APPNAME folder you created in pycharm (file -> open)

your app should look something like this:

<img width="418" alt="Screen Shot 2019-05-30 at 11 18 34 AM" src="https://user-images.githubusercontent.com/22550042/58643522-6e2f2200-82cd-11e9-9965-c73f10caf12a.png">

you'll want to **install your project dependencies**... click terminal in bottom right and run `npm i`

<img width="528" alt="Screen Shot 2019-05-30 at 11 26 59 AM" src="https://user-images.githubusercontent.com/22550042/58643749-e3025c00-82cd-11e9-872b-fff4d95164e8.png">

while that's going you need to **set up pycharm to automatically upload any files you change locally** on your laptop to your nferx server.

go to top menu and select Tools -> Deployment -> Configuration...

It might ask you to give it a server name. This name doesn't matter really but set it to whatever your server's url... eg. austin-servers.nferx.com

Next you'll get a screen like this:

<img width="899" alt="Screen Shot 2019-05-30 at 11 29 33 AM" src="https://user-images.githubusercontent.com/22550042/58643928-442a2f80-82ce-11e9-8a33-4f1bac45459b.png">

you'll know you have the correct settings for this tab if clicking 'Test Connection' succeeds.

If you get a `Keypair /Users/.../.ssh/id_rsa is corrupt or has unknown format....` error then generate a new keypair with `ssh-keygen -m PEM -t rsa` add your public key to your servers ssh authorized keys file. Copy paste the contents of the new public key file (in ~/.ssh folder) into your authorized keys file on your server `sudo vi ~/.ssh/authorized_keys`)

Next set up the mapping tab. Here you'll just need to change the Deployment Path field to correspond to the location you want your code to live on your server. Click the little folder on the right of the field to get a gui to select the appropriate folder on server.

<img width="881" alt="Screen Shot 2019-05-30 at 11 31 18 AM" src="https://user-images.githubusercontent.com/22550042/58644155-b4d14c00-82ce-11e9-9518-18e854f6c77e.png">

Exclude `node_modules` from sync (local path, not deployment path):

<img width="880" alt="Screen Shot 2019-05-30 at 11 33 55 AM" src="https://user-images.githubusercontent.com/22550042/58644242-e1856380-82ce-11e9-9012-0e8e5e939df8.png">

Finally, make sure your server is bolded (set as default). If it is not, press the check button:

<img width="170" alt="Screen Shot 2019-05-30 at 11 35 37 AM" src="https://user-images.githubusercontent.com/22550042/58644360-15608900-82cf-11e9-9a71-8b4fbecf1ff7.png">

Press OK.

Now we need to **tell pycharm to always upload files anytime they're changed**

Open this menu: Tools -> Deployment -> Options... 

<img width="810" alt="Screen Shot 2019-05-30 at 11 38 04 AM" src="https://user-images.githubusercontent.com/22550042/58644561-81db8800-82cf-11e9-8a5c-d7dcbdced906.png">

Change never to always, and press OK.

You can now **upload your new project to your server**. Simply do Tools -> Deployment -> Upload to SERVER_NAME

#### Running your server 

Use the terminal (either in pycharm or otherwise) to:

`ssh deepcompute@NFERX_SERVER`

`cd` to wherever you configured pycharm to sync

`npm i`

`npm start`

Now your dev server is running, but if you try to access your app at the url you configured in Config.js you'll likely get a 503 error. If this happens you need to configure your app in haproxy and nginx. See this article to do so: https://github.com/lumenbiomics/nfer/wiki/Development-Workflow

## Using git in pycharm

#### Quick git overview

Git is version control which means it maintains a history of code changes over time.

Generally you want to be adding your code to git often so our repository always contains up to date changes.

Adding changes to our public repository is a 3 step process. 

Add -> Commit -> Push

Add tells git to include these changes in its tracking

Commit groups a set of 'added' changes under a commit message eg. "fixed synonym bug" or whatever

Push changes what's in our global, public repository to reflect any commits that have been made on your local copy. Pushing requires that your local be totally up to date with what's on github, so it may require to you 'merge' changes others have made into your changes.

#### Pycharm color coding

Files are color coded according to their git status in pycharm.

Unchanged: White

Not yet added: Red

New File (not committed): Green

Modified File (not committed): Blue

#### Pushing changes using pycharm

To use git commands first select a file/directory in the project file viewer.

All the git commands are available in the VCS -> Git menu.

Add will add whatever file/directory you've selected in the file viewer.

Commit File (or Commit Directory if you've selected a folder) will allow you to create a commit. 

Here's the commit changes menu:

<img width="844" alt="Screen Shot 2019-05-30 at 12 09 26 PM" src="https://user-images.githubusercontent.com/22550042/58646633-d08b2100-82d3-11e9-843b-bef299216d2f.png">

Top left you'll see the files that are included in the commit. You can uncheck files you don't want to include.

Along the bottom, you'll see the diff between what's on github and what you have locally so you can compare any changes you made.

There's also a text box where you'll have to type a commit message.

Once you press the 'Commit' button, you'll notice any files that were commited will change to white. 

However, these changes have not yet been pushed to our global github repository. 

To do so, you'll have to go to VCS -> Git -> Push

<img width="647" alt="Screen Shot 2019-05-30 at 12 13 29 PM" src="https://user-images.githubusercontent.com/22550042/58646899-61fa9300-82d4-11e9-8c85-8713a777ade2.png">

Here you'll see a overview of all the commits you're pushing and the ability to diff individual files against what's on github.



