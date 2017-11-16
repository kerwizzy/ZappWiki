/************** USER MANAGER FUNCTIONS **********************/
const fs = require("fs")
var bcrypt = require('bcryptjs');
const saltLength = 10;

var users;
initUsers();
function initUsers() {
	if (!fs.existsSync("serverdata/users.json")) {
		if (!fs.existsSync("serverdata")) {
			fs.mkdirSync("serverdata")
		}
		users = []
	} else {	
		users = JSON.parse(fs.readFileSync("serverdata/users.json","utf8"));
	}
}


/*
ADMIN LEVELS
0 - admin, can do whatever

2 - able to write to wiki
3 - only able to read wiki, no editing
*/


var Users = {

checkCredentials(username,password) {//return undefined if credentials incorrect, otherwise returns user data.
	if (Users.userExists(username)) {
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

,setPassword(username,password) {
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

,userExists(username) {
	var foundUser = false
	for (var i = 0; i<users.length; i++) {
		var user = users[i]
		if (bcrypt.compareSync(username,user.u)) {
			foundUser = true
		}		
	}
	return foundUser
}

,makeUser(username,password) {
	if (Users.userExists(username)) {
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

,removeUser(username) {
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

,saveUsers() {
	console.log("Got to saveusers")
	fs.writeFileSync("serverdata/users.json",JSON.stringify(users),"utf8")
}

,setUserData(username,data) {
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

,getUserData(username) {
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
}

module.exports = Users