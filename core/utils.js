Wiki.utils = {
	getType:function(path) {
			var dirsplit = path.split("/")
			var split = dirsplit[dirsplit.length-1].split(".")
			if (split.length != 1) {
				var extension = split[split.length-1]
				var matched = extension.match(/[\w\d]+/)
				if (matched && matched[0] == extension) {
					return extension
				}
			}
			return ""
		}
	,getName:function(path) {
		var split = path.split("/")
		var name = split[split.length-1]
		var extensionStart = name.lastIndexOf(".")
		if (extensionStart == -1) {
			return name
		} else {
			return name.substr(0,extensionStart)
		}
	}
	,getParentPath(path) {
		var split = path.split("/")
		return split.slice(0,split.length-1).join("/")	
	}
	,formatTimestamp:function(timestamp) {
		var date = new Date(timestamp)
		var day = date.getDate();
		var daySuffix = "th"
		if (day == 1) {
			daySuffix = "st"
		} else if (day == 2) {
			daySuffix = "nd"
		} else if (day == 3) {
			daySuffix = "rd"
		}
		
		var monthNum = date.getMonth();
		var monthNames = [
			"January"
			,"February"
			,"March"
			,"April"
			,"May"
			,"June"
			,"July"
			,"August"
			,"September"
			,"October"
			,"November"
			,"December"		
		]
		
		var month = monthNames[monthNum]
		
		var year = date.getFullYear()
		var hours = date.getHours()
		
		var amPm = "am"
		if (hours > 11) {
			amPm = "pm"
		}
		
		hours = hours%12		
		if (hours == 0) {
			hours = 12
		}
		
		var minute = (date.getMinutes()+100).toString().substr(1)
		
		return day+daySuffix+" "+month+" "+year+" at "+hours+":"+minute+amPm
	}
	,sanitizeCode:function(code) {
		code = code.replace(/</g,"&lt;")
		code = code.replace(/>/g,"&gt;")
		return code
	}
	,combineObjects(base,toAdd) {
		var keys = Object.keys(toAdd)
		for (var i = 0; i<keys.length; i++) {
			var key = keys[i]
			base[key] = toAdd[key]
		}
		return base
	}
}