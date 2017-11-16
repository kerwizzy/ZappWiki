var prompt = require("prompt")
const fs = require("fs")
var Users = require("./server/users.js")
var serverdata = {}
var users = {}

function setup() {
	prompt.start();
	prompt.message = ""
	p("Welcome to ZappWiki! This wizard will help you get your server up and running.")
	p("")


	
	var SCHEMA = {
		properties: {
			cert: {
				description:"Path to HTTPS Certificate"
				,required: false
			}
			,key: {
				description:"Path to HTTPS Key"
				,required: false
			}
			,passphrase: {
				description:"Path to HTTPS Passphrase File"
				,required: false
			}
			,httpsport: {
				description:"Https port to listen on (use n to disable, not recommended)"
				,required: true
				,default:443
			}
			,httpport: {
				description:"Http port to listen on (used for redirecting to https or for http-only)"
				,required: true
				,default:80
			}
			,username:{
				description:"Administrator Username (you can change it later)"
				,message:"You must enter a username."
				,required:true
			}
			,password:{
				description:"Administrator Password"
				,hidden:true
				,required:true
				,message:"You must enter a password."
				,replace:"*"
			}
		}
	};	
	prompt.get(SCHEMA,function(err,res) {
		serverdata.cert = res.cert
		serverdata.key = res.key
		serverdata.passphrase = res.passphrase
		if (serverdata.httpsport == "n") {
			serverdata.https = false
		} else {
			serverdata.https = true
			serverdata.httpsport = res.httpsport
		}
		serverdata.httpport = res.httpport
		fs.writeFileSync("serverconfig.json",JSON.stringify(serverdata))
		
		
		Users.makeUser(res.username,res.password)
		Users.saveUsers()
	})
	
	
	
	
	
	

}

module.exports = setup;

function p(str) {
	console.log(str)
}
