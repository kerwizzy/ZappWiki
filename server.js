var verbose = true;
const rfs = require("fs")
var fs = {
	readdirSync:rfs.readdirSync
	,existsSync:rfs.existsSync
	,readFileSync:rfs.readFileSync
	,readFile:rfs.readFile
	,statSync:rfs.statSync
	,mkdirSync:rfs.mkdirSync
	,rmdirSync:rfs.rmdirSync
	,writeFileAsync:function(path,data,encoding,username) {
		rfs.writeFileSync(path,data,encoding)
	}
	,unlinkAsync:function(path,username) {
		rfs.unlinkSync(path)
	}
	,renameAsync:function(path1,path2,username) {
		rfs.renameSync(path1,path2)
	}	
}

const FS_WRAPPER = "wrappers/standard/fs.js"
const FILE_WRAPPER = "wrappers/standard/file.js"




const https = require("https")

var bcrypt = require('bcryptjs');
var Cookies = require("cookies")

const crypto = require('crypto');
const querystring = require("querystring")
const sjcl = require("sjcl")

//var WikiSync = require("./sync.js")


var serverconfig = JSON.parse(fs.readFileSync("serverconfig.json"))

const port = serverconfig.port
const url = require('url')  
const util = require("util")

var httpskey = fs.readFileSync(serverconfig.key);
var httpscert = fs.readFileSync(serverconfig.cert)
if (fs.existsSync("serverdata/https/passphrase.txt")) {
	var httpspassphrase = fs.readFileSync("serverdata/https/passphrase.txt","utf8");
} else {
	var httpspassphrase = ""
}


var authLifespan = 120*60*1000 //120 min


var httpsData = {
	key:httpskey
	,cert:httpscert
	,passphrase:httpspassphrase
}
var PUBLIC_URL = "/public"
var server = https.createServer(httpsData,function(req,res){
	// Set CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-req-Method', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
	res.setHeader('Access-Control-Allow-Headers', '*');
	
	if (req.method === 'OPTIONS' ) {
		res.writeHead(200);
		res.end();
		return;
	}
	
	
	var parsed = url.parse(req.url) //parse query string
		
	cookies = new Cookies(req, res)
	var authtoken = cookies.get("authtoken")
	if (!checkAuth(authtoken)) {
		//Show the login screen or (if it is a POST request) check the password and possibly set an authtoken.
		if (req.method == "POST") {
			var body = [];
			req.on('data', function(chunk) {
				body.push(chunk);
			}).on('end', function() {
				if (body == "USERDATA") {
					res.end(JSON.stringify({l:100}));
					//Note that this will only usually happen if the user logged out in another page: If the client keeps pinging the server to check if it is logged in, then it will continue to renew the login. What to do about this?
				} else {
				
					body = Buffer.concat(body).toString();
					// at this point, `body` has the entire request body stored in it as a string
					
					var parsedForm = querystring.parse(body)
					
					var username = parsedForm.zappwikiusername
					var password = parsedForm.zappwikipassword
					
					var user = checkCredentials(username,password)
					if (user) {
						if (!user.d.ct) { //if this user hasn't been converted to encrypted data
							console.log("Encrypting data for user "+username);
							user.d = JSON.parse(sjcl.encrypt(password, JSON.stringify(user.d))) //sjcl returns a string json, it seems
						}
					
						var data = JSON.parse(sjcl.decrypt(password,JSON.stringify(user.d))) //This makes a copy as well as decrypting. sjcl apparently takes strings.
						
						//delete data.storage; //This is only for testing/resetting the storage on login. DON'T USE WHEN NOT TESTING
					
						user.d = JSON.parse(sjcl.encrypt(password, JSON.stringify(data))) //Reencrypt the data so the salt, etc. changes every time. WARNING: THIS MIGHT BE A SECURITY VULNERABILITY! SEE COMMENT IN SAVEUSERS()
						saveUsers();
						
						
						data.username = username
						data.password = password
						console.log("Correct password. Setting auth token for '"+username+"'.")
						cookies.set("authtoken",newAuth(authLifespan,data))
						res.statusCode = 302
						res.setHeader("Location","/home")
						res.end();
					} else {
						res.statusCode = 302
						res.setHeader("Location","/login_error")
						res.end();
					}
				}
				
			})
		} else if (req.url.substr(0,PUBLIC_URL.length) == PUBLIC_URL) {
			var path = "./wiki"+parsed.pathname
			stdResponse(res,path)
		} else {
			var loginPage =fs.readFileSync("login.html","utf8")
			if (req.url == "/login_error") {
				loginPage = loginPage.replace("<!--ERROR-->","<span class='error'>Incorrect Username or Password</span><BR><BR>")
			} else {
				loginPage = loginPage.replace("<!--ERROR-->","")
			}
			res.end(loginPage)
		}
		
	} else {
		renewAuth(authtoken,authLifespan)
		
		if (req.method == "POST") {
			res.setHeader('Content-Type', 'text/plain')
			var body = [];
			req.on('data', function(chunk) {
				body.push(chunk);
			}).on('end', function() {
				body = Buffer.concat(body).toString();
				// at this point, `body` has the entire request body stored in it as a string
				
				if (body == "LOGOUT") {
					console.log("Logging out " + getAuthData(authtoken).username+"...")
					removeAuth(authtoken);
					res.end();
				} else if (body == "USERDATA") {
					var authdata = JSON.parse(JSON.stringify(getAuthData(authtoken)))
					delete authdata.password; //Don't send the password, only the username and other data. However, we need the password on the server so we can set user data
					var responseText = JSON.stringify(authdata)
					//console.log("Responding to USERDATA with "+responseText)
					res.end(responseText);
				} else {				
					body = body.split("\n")
					if (body[0] == "SAVESTORAGE") { //Save user storage (like localstorage, but on the server)
						var authdata = getAuthData(authtoken)
						var username = authdata.username
						var password = authdata.password
						if (verbose) {
							console.log("Got savestorage request. "+username+":"+password)
						}
						var user = checkCredentials(username,password)
						var toStore = JSON.parse(body[1])
						if (verbose) {
							console.log("Storage Body = "+JSON.stringify(toStore))
						}
						var data = JSON.parse(sjcl.decrypt(password,JSON.stringify(user.d))) //This makes a copy as well as decrypting. sjcl apparently takes strings.
						
						data.storage = toStore
						data.username = username //Need to set these again because they aren't stored in the user file
						data.password = password
						setAuthData(authtoken,data)
						user.d = JSON.parse(sjcl.encrypt(password, JSON.stringify(data)))
						saveUsers();
					} else {
						var startTime = Date.now()
						respond(body,authtoken).then(function(responseData) {
							if (responseData) {
								res.end(responseData.toString())
							} else {
								res.end()
							}
						})
					}
				}
			})		
		} else {
			var fsExtensionStart = parsed.pathname.lastIndexOf(".")
			var extension = parsed.pathname.substr(fsExtensionStart+1)
			if (fsExtensionStart == -1) {
				extension = ""
			}
			
			var path = "./wiki"+parsed.pathname
			
			path = path.replace(/%20/g," ")
			if (extension == "" || extension == "zappwiki") {
				if (fs.existsSync(path)) {
					if (fs.statSync(path).isDirectory()) {
						res.statusCode = 302
						res.setHeader("Location",parsed.pathname+(parsed.pathname.substr(-1,1) == "/" ? "" : "/")+"index")
						res.end();
						return
					}
				}
				var templatePath = "core/template.html"
				res.end(fs.readFileSync(templatePath,"utf8"))
			} else {
				var corePath = "/src/core/"
				var bootstrapPath = "/src/bootstrap/"
				var treeviewPath = "/src/treeview/"
				var fontsPath = "/src/fonts/"
				var fsWrapperPath = "/src/wrappers/fs.js"
				var fileWrapperPath = "/src/wrappers/file.js"
				var srcPath = "/src/"
				
				if (parsed.pathname == "/system/user/preload.js") {
					res.end(getAuthData(authtoken).preload)
					return;
				} else if (parsed.pathname == "/system/user/postload.js") {
					res.end(getAuthData(authtoken).postload)
					return;
				}
				
				if (parsed.pathname.startsWith(srcPath)) {
					if (parsed.pathname.startsWith(corePath)) {
						path = parsed.pathname.replace(corePath,"core/");
					} else if (parsed.pathname.startsWith(bootstrapPath)) {
						path = parsed.pathname.replace(bootstrapPath,"assets/bootstrap/");
					} else if (parsed.pathname.startsWith(treeviewPath)) {
						path = parsed.pathname.replace(treeviewPath,"assets/treeview/");
					} else if (parsed.pathname.startsWith(fontsPath)) {
						path = parsed.pathname.replace(fontsPath,"assets/fonts/");
					} else if (parsed.pathname == fsWrapperPath) {
						path = FS_WRAPPER
					} else if (parsed.pathname == fileWrapperPath) {
						path = FILE_WRAPPER
					} else {
						res.statusCode = 404;
						res.statusMessage = 'Not found'
						res.end("<head><title>WikiServer: 404</title></head><body><h1>404 Not Found</h1></body>")
						return;
					}
					console.log("Got source request for "+path)
				}
				
				stdResponse(res,path)
				
				
			}		
		}
	}
})

function stdResponse(res,path) {
	fs.readFile(path,function(err,data) {
		if (err) {
			if (err.errno = -4058) {
				res.statusCode = 404;
				res.statusMessage = 'Not found'
				res.end("<head><title>WikiServer: 404</title></head><body><h1>404 Not Found</h1></body>")
			} else {
				console.log(err)
				res.end()
			}
		} else {
			res.end(data)
		}
	})
}
	
	
server.listen(port, function(err) {  
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log("server is listening on port "+port+".")
/*
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
console.log('Server IP: '+add);
})
*/
})


var os = require('os');
var ifaces = os.networkInterfaces();
//From https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0;

  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      console.log(ifname, iface.address);
    }
    ++alias;
  });
});


/*********** AUTH TOKENS MANAGER FUNCTIONS ****************/

var validAuthTokens = []
function checkAuth(authtoken) {	
	for (var i = 0; i<validAuthTokens.length; i++) {
		var token = validAuthTokens[i]
		if (token.expiration > Date.now()) {
			if (token.key == authtoken) {
				return true
			}			
		}		
	}
	return false
}

function getAuthData(authtoken) {
	for (var i = 0; i<validAuthTokens.length; i++) {
		var token = validAuthTokens[i]
		if (token.expiration > Date.now()) {
			if (token.key == authtoken) {
				return token.data
			}			
		}		
	}
	//return undefined if does not exist or is expired
}

function setAuthData(authtoken,data) {
	for (var i = 0; i<validAuthTokens.length; i++) {
		var token = validAuthTokens[i]
		if (token.key == authtoken) {
			token.data = data
		}				
	}
}

function removeAuth(authtoken) {
	for (var i = 0; i<validAuthTokens.length; i++) {
		var token = validAuthTokens[i]
		if (token.key == authtoken) {
			token.expiration = 0; //We should probably delete the token instead of just making it expire...
		}	
	}
}


function newAuth(lifespan,data) { //lifespan is the number of milliseconds until the token should expire
	var keystring = crypto.randomBytes(256).toString('base64')
	var expiration = Date.now()+lifespan
	var token = {key:keystring,expiration:expiration,data:data}
	validAuthTokens.push(token)
	return keystring
}

function renewAuth(authtoken,lifespan) {
	for (var i = 0; i<validAuthTokens.length; i++) {
		var token = validAuthTokens[i]
		if (token.key == authtoken) {
			token.expiration = Date.now()+lifespan;
		}	
	}
}


/************** USER MANAGER FUNCTIONS **********************/

const saltLength = 10;

var users;
initUsers();
function initUsers() {
	users = JSON.parse(fs.readFileSync("serverdata/users.json","utf8"));
}


/*
ADMIN LEVELS
0 - admin, can do whatever

2 - able to write to wiki
3 - only able to read wiki, no editing
*/




function checkCredentials(username,password) {//return undefined if credentials incorrect, otherwise returns user data.
	if (userExists(username)) {
		for (var i = 0; i<users.length; i++) {
			var user = users[i]
			if (bcrypt.compareSync(username,user.u)) {
				if (bcrypt.compareSync(password,user.p)) {
					return user
				} else {
					console.log("Incorrect Credentials: Password incorrect.")
				}
			}		
		}
	} else {
		console.log("Incorrect Credentials: User '"+username+"' does not exist.")
	}
	
}

function setPassword(username,password) {
	var passwordHash = bcrypt.hashSync(password, saltLength);
	
	var foundUser = false
	for (var i = 0; i<users.length; i++) {
		var user = users[i]
		if (bcrypt.compareSync(username,user.u)) {
			user.p = passwordHash
			foundUser = true
		}		
	}
	
	if (!foundUser) {
		makeUser(username,password)
	}
	saveUsers();
}

function userExists(username) {
	var foundUser = false
	for (var i = 0; i<users.length; i++) {
		var user = users[i]
		if (bcrypt.compareSync(username,user.u)) {
			foundUser = true
		}		
	}
	return foundUser
}

function makeUser(username,password) {
	if (userExists(username)) {
		console.log("ERROR: Username already exists.")
		return "Username already exists."
	} else {
		var passwordHash = bcrypt.hashSync(password, saltLength);
		var usernameHash = bcrypt.hashSync(username, saltLength);
		
		var user = {}
		user.u = usernameHash
		user.p = passwordHash
		user.d = {l:2} //TODO: this should be encrypted
		
		users.push(user)
		console.log("Making user "+username+":"+password)
		saveUsers();
		return "Created user."
	}
}

function removeUser(username) {
	var foundUser = false
	for (var i = 0; i<users.length; i++) {
		var user = users[i]
		if (bcrypt.compareSync(username,user.u)) {
			foundUser = true
			users.splice(i,1)
			saveUsers();
			return "Deleted user '"+username+"'."			
		}		
	}
	if (!foundUser) {
		return "User '"+username+"' does not exist."
	}
}

function saveUsers() {
	console.log("Got to saveusers")
	//Is this a problem because it could be a race condition?
	fs.writeFileAsync("serverdata/users.json",JSON.stringify(users),"utf8")//Warning: By looking at commit times and differences between commits, an attacker with access to the repo can discover which users in the list are active and when, because currently the salt of thier userdata changes on login.  
}

function setUserData(username,data) {
	var foundUser = false
	for (var i = 0; i<users.length; i++) {
		var user = users[i]
		if (bcrypt.compareSync(username,user.u)) {
			foundUser = true
			user.d = data
		}		
	}
	if (!foundUser) {
		console.log("ERROR: User does not exist; cannot set user data.")
	} else {
		saveUsers();
	}
}

function getUserData(username) {
	for (var i = 0; i<users.length; i++) {
		var user = users[i]
		if (bcrypt.compareSync(username,user.u)) {
			foundUser = true
			if (!user.d) {
				user.d = {}
			}
			return user.d
		}		
	}		
}

/*
FORMAT OF WRITE COMMAND

index   value
-------------
0		WRITE
1		path/to/file
2		utf8
3		data
4		more data
5		yet more data
6		even more data
*/


function unescapeArrData(arr,numArgs) { //Combines the elements of an array starting at index numArgs, into one element seperated by new lines
	var data = arr.slice(numArgs)
	var beforeData = arr.slice(0,numArgs)
	data = data.join("\n")
	beforeData.push(data)
	return beforeData
}


var wikiPath = "./wiki/"


async function respond(arr,authtoken) {	
	var auth = getAuthData(authtoken)
	
	var cmd = arr[0]
	var path = wikiPath+arr[1]
	
	if (verbose) {
		console.log(arr.join("\n"))
		if (cmd=="WRITE") {
			console.log("Parent Path =" + getParentPath(path))
		}
		console.log("Auth = "+JSON.stringify(auth))
	}
	//console.log(path)
	try {
		if (cmd == "WRITE" && (auth.l <= 2 || getParentPath(path) == wikiPath+"system/temp")) {
			arr = unescapeArrData(arr,3)
			var data = arr[3]
			var encoding = arr[2]
			
			await fs.writeFileAsync(path,data,encoding,auth.username)			
		} else if (cmd == "READ") {		
			var encoding = arr[2]
			return fs.readFileSync(path,encoding)
		} else if (cmd == "STAT") {
			var stat = fs.statSync(path)
			var out = [
				stat.dev
				,stat.ino
				,stat.mode
				,stat.nlink
				,stat.uid
				,stat.gid
				,stat.rdev
				,stat.size
				,stat.blksize
				,stat.blocks
				,stat.atime.getTime()
				,stat.mtime.getTime()
				,stat.ctime.getTime()
				,stat.birthtime.getTime()
				,stat.isFile()
				,stat.isDirectory()
			]
			return out.join(",")
		} else if (cmd == "READDIR") {
			return fs.readdirSync(path).join(",")
		} else if (cmd == "MKDIR" && auth.l <= 2) {
			fs.mkdirSync(path)
		} else if (cmd == "RMDIR" && auth.l <= 2) {
			fs.rmdirSync(path)			
		} else if (cmd == "UNLINK" && auth.l <= 2) {
			await fs.unlinkAsync(path,auth.username)
		} else if (cmd == "RENAME" && auth.l <= 2) {
			await fs.renameAsync(path,wikiPath+arr[2],auth.username)			
		} else if (cmd == "EXISTS") {
			return fs.existsSync(path)
		} else if (cmd == "TREE") {
			return JSON.stringify(genFsTree("./wiki",false,false).tree)
		} else if (cmd == "SEARCHTREE") {
			return JSON.stringify(genFsTree("./wiki",false,true).tree)
		} else if (cmd == "SETPRELOAD") {
			auth.preload = unescapeArrData(arr,1)[1]
			setAuthData(authtoken,auth)
		} else if (cmd == "SETPOSTLOAD") {
			auth.postload = unescapeArrData(arr,1)[1]
			setAuthData(authtoken,auth)
		} else if (cmd == "SYNC" && auth.l <= 1) {
			return await syncWiki();
		} else if (cmd == "ADDREMOTE" && auth.l <= 0) {
			git.addRemote(arr[1],arr[2])
		} else if (cmd == "REMOVEREMOTE" && auth.l <= 0) {
			git.addRemote(arr[1])
		} else if (cmd == "GETREMOTES") {
			return await new Promise(function(resolve,reject) {
				git.getRemotes(true,function(err,data) {
					if (err) {
						reject(err)
					} else {
						resolve(JSON.stringify(data))
					}
				})
			})
		} else if (cmd == "GETWRAPPERCONFIG") {
			return JSON.stringify({
				fs:"standard"
				,file:"standard"
			})
		} else if (cmd == "MKUSER" && auth.l <= 0) {
			var username = arr[1]
			var password = arr[2]
			return makeUser(username,password)
		} else if (cmd == "RMUSER" && auth.l <= 0) {
			var username = arr[1]
			return removeUser(username)
		}
	} catch (err) {
		if (verbose) {
			console.log("Caught error:\t\t"+err)
		}
		return ""
	}
}

function getParentPath(path) {
	var split = path.split("/")
	split.pop();
	return split.join("/")
}

function syncWiki() {
	return new Promise(function(resolve,reject) {
		git.getRemotes(true,function(err,remotes) {
			if (err) {
				reject(err)
			} else {
				for (var i = 0; i<remotes.length; i++) {
					var remote = remotes[i]
					console.log("Pushing to "+remote.name+" ...")
					git.push(remote.name,"master",function(err,data) {
						console.log("Done.")
						resolve();
					})				
				}
			}
		})
	})	
}

class AST {
	constructor(tree) {
		if (!tree) {
			this.tree = []
		} else {
			this.tree = tree //There is not a tree.slice(0) here on purpose. 
		}
	}
	
	getNode(treeIndex) {
		var node = this.tree
		for (var i = 0; i<treeIndex.indexList.length; i++) {
			node = node[treeIndex.indexList[i]]
			if (!node) {
				return //throw "Node -"+treeIndex.indexList.slice(0,i).join("-")+" does not exist in this tree."
			}
		}
		return node
	}
	
	getFirstChild(treeIndex) {
		var node = this.getNode(treeIndex)
		return node[0]	
	}
		
	lastChildIndex(treeIndex) { //get the index of the last child of treeIndex
		var parentNode = this.getNode(treeIndex)
		var lastChildNum = parentNode.length-1
		var duplicated = treeIndex.duplicate()
		duplicated.push(lastChildNum)
		return duplicated
	}
	
	addChild(treeIndex,child) { //treeIndex = treeIndex of parent
		//This returns the index of the new child
		var parentNode = this.getNode(treeIndex)
		parentNode.push(child)
		return this.lastChildIndex(treeIndex)
	}
	
	addChildren(treeIndex,children) {
		var parentNode = this.getNode(treeIndex)
		for (var i = 0; i<children.length; i++) {
			parentNode.push(children[i])
		}
	}
	
	addChildTree(treeIndex,tree) {
		if (Array.isArray(tree)) {
			this.addChildren(treeIndex,tree)
		} else if (typeof tree == "number" || typeof tree == "string") {
			this.addChild(treeIndex,tree)
		} else {
			this.addChild(treeIndex,tree.tree)
		}
	}
	
	deleteNode(treeIndex) { //treeIndex = treeIndex of node
		var parentNode = this.getNode(treeIndex.parentIndex)
		delete parentNode[treeIndex.childNumber]
	}
	
	iterate(callback,index) { //index is not used by a standard user. It is used internally here to allow for a recursive algorithm. NOTE: index is an Array, not a TreeIndex
		var isTop = false //if we are iterating on the root node
		if (typeof index == "undefined") {
			index = []
			isTop = true
		}
		index.push(0)
		
		for (var i = 0; i<this.tree.length; i++) {
			index[index.length-1] = i
			if (i != 1 || isTop) {//Skip the name of the node (i=0) unless we are iterating on the root node
				var node = this.tree[i]
				if (typeof node != "undefined") {
					callback(new TreeIndex(index))
					if (!Array.isArray(node)) {
						//Do nothing
					} else {				
						var nodeAst = new AST(node)
						nodeAst.iterate(callback,index)
					}
				}
			}
		}
	}
	
	merge() { //This simply merges all nodes, loosing all the indenting information.
		var out = ""
		for (var i = 0; i<this.tree.length; i++) {
			var node = this.tree[i]
			if (typeof node != "undefined") {
				if (!Array.isArray(node)) {
					out += node.toString()
				} else {
					var nodeAst = new AST(node)
					out += nodeAst.merge()
				}
				
				if (i != this.tree.length-1) {
					out += "\n"
				}
			}
		}
		return out	
	}
	
	
	toHTML(indentLevel) {
		var doPreWrapper =false
		if (typeof indentLevel == "undefined") {
			indentLevel = 0
			doPreWrapper = true
		}
		
		var indentString = ""
		for (var j = 0; j<indentLevel-1; j++) { //The first line is NOT supposed to be indented. We add the last \t below, after the first line
			indentString += "\t"
		}
		
	
		var out = ""
		if (doPreWrapper) {
			out = "<pre>"
		}
		for (var i = 0; i<this.tree.length; i++) {
			var node = this.tree[i]
			if (typeof node != "undefined") {
				if (!Array.isArray(node)) {
					if (i == 0) {
						out += indentString
						out += "<b>"+node.toString()+"</b>"
						indentString += "\t"
					} else {
						out += indentString
						out += node.toString()
					}
				} else {
					var nodeAst = new AST(node)
					out += nodeAst.toHTML(indentLevel+1)
				}
				
				if (i != this.tree.length-1) {
					out += "\n"
				}
			}			
		}
		if (doPreWrapper) {
			out += "</pre>"
		}
		
		return out
	}
}

class TreeIndex {
	constructor(indexList) { //Index list is a list of indexes into sub-nodes in tree. An empty array specifies the root node. Standard notation for array [0,1,2,3,4,5]: -0-1-2-3-4-5
		this.indexList = indexList
	}
	
	push(val) {
		return this.indexList.push(val)
	}
	
	pop() {
		return this.indexList.pop()
	}
	
	get parentIndex() {
		var parentIndex = this.indexList.slice(0,this.indexList.length-1) //Remove the last element
		return new TreeIndex(parentIndex)
	}
	
	get childNumber() {
		return this.indexList[this.indexList.length-1]
	}
	
	get firstAncestor() {
		return new TreeIndex(this.indexList[0])
	}
	
	nextChild() {//Go to the next child
		this.indexList[this.indexList.length-1]++
	}
	
	duplicate() {
		return new TreeIndex(this.indexList.slice(0))
	}
}

function genFsTree(path,isLower,isSearch) {
	var tree = new AST()
	var idx = new TreeIndex([])
	tree.addChild(idx,"directory") //do we want this?
	var lastSlash = path.lastIndexOf("/")
	var dirname = ""
	if (lastSlash != -1) {
		dirname = path.substr(lastSlash+1)
	}
	tree.addChild(idx,dirname)
	
	var directory = fs.readdirSync(path)
	for (var i = 0; i<directory.length; i++) {
		var name = directory[i]
		var stats = fs.statSync(path+"/"+name)
		if (stats.isFile()) {
			if (name != "index.zappwiki" || isSearch) { //hide index files
				idx = tree.addChild(idx,["file"])
				

				if (!isSearch) {
					var extensionStart = name.lastIndexOf(".")
					var extension = ""
					if (extensionStart != -1) {
						extension = name.substr(extensionStart+1)
					}
					
					name = name.substr(0,extensionStart) //remove the extension
				}
				
				
				tree.addChild(idx,name)
				tree.addChild(idx,path.replace("./wiki","")+"/"+name)
				idx.pop()
				}
		} else if (stats.isDirectory()) {
			var directoryTree = genFsTree(path+"/"+name,true,isSearch)
			tree.addChildTree(idx,directoryTree)
		}
	}
	
	return tree
}