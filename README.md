# ZappWiki
A node-based Wiki engine that supports scripts, WYSIWYG editing and more 

ZappWiki is currently in the pre-alpha stage, so it is not recommended for actual use. However, if you want to try it out, here's how:

1. Clone this repository into wherever you want your wiki to be.
2. run `npm install` to install all necessary node packages.
3. Inside the serverdata, create a directory called https. Add your https certificate and key here. Call the certificate `cert.pem` and the key `key.pem`.
4. Run `node server.js` and answer the prompts to configure the server. Enter the path to your https certificate and key. Leave "https passphrase" blank.
5. Run `node server.js` again to start the server.
5. Head over to `https://localhost` to try out the Wiki.

