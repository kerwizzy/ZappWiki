var prompt = require("prompt")
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
				,required: true
			}
			,key: {
				description:"Path to HTTPS Key"
				,required: true
			}
			,httpsport: {
				description:"Https port to listen on"
				,required: true
				,default:443
			}
			,httpport: {
				description:"Http port to listen on (only used for redirecting to http)"
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
		serverdata.httpsport = res.httpsport
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
