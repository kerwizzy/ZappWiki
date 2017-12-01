var Wiki = {
	runRuleList:function(ruleList) {	
		for (var i = 0; i<ruleList.length; i++) {
			var rule = ruleList[i]
			if (!rule.disabled) {
				try {
					rule.rule();
				} catch(err) {
					console.error('ERROR IN RULE "'+rule.name+'":\t'+err)
				}
			}			
		}		
	}
	,getRule:function(ruleList,name) {
		for (var i = 0; i<ruleList.length; i++) {
			var rule = ruleList[i]
			if (rule.name == name) {
				return rule
			}			
		}		
	}
	,getRuleIndex:function(ruleList,name) {
		for (var i = 0; i<ruleList.length; i++) {
			var rule = ruleList[i]
			if (rule.name == name) {
				return i
			}			
		}		
	}
	,addRuleAfter:function(ruleList,name,rule) {
		var index = Wiki.getRuleIndex(ruleList,name)
		if (typeof index != "undefined") {
			ruleList.splice(index+1,0,rule)
		}
	}
	,addRuleBefore:function(ruleList,name,rule) {
		var index = Wiki.getRuleIndex(ruleList,name)
		if (typeof index != "undefined") {
			ruleList.splice(index,0,rule)
		}
	}	
	,showPopdown(text) {
		document.getElementById("popdown").innerHTML = text
		document.getElementById("popdown").classList.remove("popdown-animation")
		setTimeout(function() {
			document.getElementById("popdown").classList.add("popdown-animation")
		},10)
	}
	,showModal(title,body,ok,close) {
		document.getElementById("tempModal-title").innerHTML = title
		document.getElementById("tempModal-body").innerHTML = body
		if (close) {
			document.getElementById("tempModal-close").onclick = close
			document.getElementById("tempModal-closeTop").onclick = close
		}
		document.getElementById("tempModal-confirm").onclick = ok
		$('#tempModal').modal(); 
	}
	,imageExtensions:[
		"png"
		,"jpg"
		,"bmp"
		,"jpeg"
	]	
	,includeScript(fileName) {
		var script   = document.createElement("script");
		script.type  = "text/javascript";
		script.src   = fileName;
		document.body.appendChild(script);
	}	
	,parse:function(markup,filter,invert) {
		if (!filter) {
			filter = []
			invert = true
		}
		
		if ((filter.indexOf("initialLinebreak") != -1) != invert) { 
			markup = "\n\n"+markup
		}
		
		var inP = false
		var inRaw = false
		var html = ""
		var i = 0;
		while (i < markup.length) {
			var foundSomething = false
			if (markup.substr(i,2) == "@@") {
				inRaw = !inRaw
				i += 2				
			} else {
				if (!inRaw) {
					for (var r = 0; r<Wiki.parser.rules.length; r++) {
						var rule = Wiki.parser.rules[r]
						var ruleAllowed = filter.indexOf(rule.name) != -1
						ruleAllowed = ruleAllowed != invert //XOR invert and ruleAllowed
						if (ruleAllowed) {
							var start = rule.start
							var parse = rule.parse
							var end = rule.end || rule.start
							try {
								var startText = Wiki.parser.testMatch(start,i,markup)
								if (startText) {
									if (inP && rule.closeParagraph) {
										html+="</p>"
										inP = false
									}
									
									var endText
									for (var j = i+startText.length; j<markup.length; j++) {
										if (markup.substr(j,2) == "@@" && !(rule.allowRaw === false)) {
											inRaw = !inRaw
											j++
										}
										if (!inRaw) {
											endText = Wiki.parser.testMatch(end,j,markup)
											if (endText) {
												break;
											}
										}
									}
									var substring = markup.substring(i+startText.length,j)
									
									
									var parsed = rule.parse(substring,startText,endText)
									
									if (!rule.allowZeroWidthSpaces) {
										parsed = parsed.replace(/&#8203;/g,'');
										parsed = parsed.replace(/&#x200b;/g,'');
										parsed = parsed.replace(/\uB200/g,''); //This allows zero width spaces to be used as an escape character. We have to do the replacement after it is parsed in order to let this happen.
									}
									if (typeof parsed == "undefined") {
										debugger;
									}
									html += parsed
									if (endText) {
										if (rule.dontSkipEnd) {
											i = j
										} else {
											i = j+endText.length //Or something else?
										}
									} else {
										i = j+1 //At end
									}
									if (rule.postInsert) {
										console.log("Post insert.")
										var before = markup.substr(0,i)
										var after = markup.substr(i)
										markup = before+rule.postInsert+after
										//Maybe have some way of returning the post insert if we are in a recursive thing?
									}					
									foundSomething = true
									break;
								}
							} catch (err) {
								console.error('PARSE ERROR IN RULE "'+rule.name+'":\t'+err)
							}
						}
					}
				}
				if (!foundSomething) {
					if ((((i == 0 || lastFoundSomething) && !inP) || (markup[i] == "\n" && markup[i-1] == "\n")) && ((filter.indexOf("paragraph") != -1) != invert) && !inRaw) { //if paragraphs allowed
						if (inP) {
							html += "</p>"
						}
						html += "<p>"
						inP = true
					}
					html += markup[i]
					i++				
				}
				lastFoundSomething = foundSomething
			}
		}
		if (inP) {
			html += "</p>"
		}
		return html
	}
	,singleLine:["paragraph","hr","initialLinebreak"]
	,autoGrow:function(element) {
		element.style.height = "5px";
		element.style.height = "500px"//((element.scrollHeight)+100)+"px";
	}
	,editing:false
	,toggleEdit:function() {
		if (Wiki.editing) {
			Wiki.editing = false
			Wiki.saveCurrent()
		} else {
			Wiki.editing = true
			Wiki.editCurrent()
		}
		Wiki.updateEditClasses()
	}
	,toggleWYSIWYG:function() {
		if (Wiki.wysiwyg) {
			document.getElementById("wysiwygToggle").innerHTML = "WYSIWYG"
			node.text = Wiki.wysiwygEditor.html
			document.getElementById("texteditwrapper").innerHTML = "<textarea id='textedit'></textarea>"
			document.getElementById('textedit').value = node.text
			Wiki.wysiwyg = false
		} else {
			document.getElementById("wysiwygToggle").innerHTML = "Markup"
			
			node.text = document.getElementById('textedit').value
			var html = Wiki.parse(node.text.replace(/<p>\s*<\/p>/g,""))
			
			var height = document.getElementById("textedit").style.height			
			
			document.getElementById("texteditwrapper").innerHTML = ""
			
			Wiki.wysiwygEditor = new Wiki.editor(document.getElementById("texteditwrapper"),html)
			Wiki.wysiwygEditor.addStandardButtons();
			Wiki.wysiwygEditor.height = height
			
			Wiki.wysiwyg = true
		}
	}
	,updateEditClasses:function() {
		if (Wiki.editing) {
			document.getElementById("editbuttonicon").className = "fa fa-fw fa-check"
			document.getElementById("editbuttontext").innerHTML = "Confirm edit"
			document.getElementById("editbuttonicon_expand").className = "fa fa-fw fa-check"
			document.getElementById("cancelButton").style.display = ""
			document.getElementById("cancelButton_expandSidebar").style.display = ""
			document.getElementById("settingsButton").style.display = ""
			//document.getElementById("deleteButton").style.display = ""
		} else {
			document.getElementById("editbuttonicon").className = "fa fa-fw fa-pencil"
			document.getElementById("editbuttontext").innerHTML = "Start editing"
			document.getElementById("editbuttonicon_expand").className = "fa fa-fw fa-pencil"
			document.getElementById("cancelButton").style.display = "none"
			document.getElementById("cancelButton_expandSidebar").style.display = "none"
			document.getElementById("settingsButton").style.display = "none"
			//document.getElementById("deleteButton").style.display = "none"
		}
	}
	,cancelEdit:function(){
		Wiki.loader.reload()
	}
	,editCurrent:function() {
		Wiki.runRuleList(Wiki.edit.rules);
	}	
	,saveNoReload() {
		if (Wiki.editing) {
			Wiki.runRuleList(Wiki.save.rules);
			Wiki.showPopdown("Saved page.")
			Wiki.file.save(node)
		}
	}
	,saveCurrent:function() {
		Wiki.runRuleList(Wiki.save.rules);
		
		var newPath = document.getElementById("settingsFilePath").value
		
		Wiki.file.save(node).then(
		function(data) {
			if (newPath != node.path) {
				Wiki.file.move(node.path,newPath).then(function() {
					location.assign("/"+newPath)
				})
			} else {			
				Wiki.loader.reload();
			}
		})
	}
	,setStorage:function() {
		var key = arguments[0]
		var subkey
		var value
		if (!Wiki.storage) {
			Wiki.user.storage = {}
			Wiki.storage = Wiki.user.storage
		}
		
		if (arguments.length == 2) {
			value = arguments[1]
			Wiki.storage[key] = value 
		} else {
			subkey = arguments[1]
			value = arguments[2]
			if (!Wiki.storage[key]) {
				Wiki.storage[key] = {}
			}
			Wiki.storage[key][subkey] = value
		}
		//TODO: should we autosave? or let people do that by calling Wiki.saveStorage()?
		
	}
	,getStorage:function(key) {
		var key = arguments[0]
		var subkey
		var value
		if (Wiki.storage) {
			if (arguments.length == 1) {
				return Wiki.storage[key]
			} else {
				subkey = arguments[1]
				if (Wiki.storage[key]) {
					var val = Wiki.storage[key][subkey] 
					return val
				}
			}
		}		
	}
	,saveStorage:function(callback) {
		Wiki.file.saveStorage(callback)		
	}
	,setPref(pref,val) {
		Wiki.setStorage("PREFERENCES",pref,val);
	}
	,getPref(pref) {
		return Wiki.getStorage("PREFERENCES",pref);
	}
	,newFile:function() {
		if (Wiki.user.l >= 3) {
			alert("You do not have permission to make new files.")
		} else {
			var name = prompt("File Name")
			if (name) {
				var newPath = node.path.split("/")
				newPath[newPath.length-1] = name
				newPath = newPath.join("/")
				Wiki.file.newPage(newPath).then(
				function(data) {
					Wiki.loader.reload();
				})
			}
		}
	}
	,newJournalFile:function() {
		if (Wiki.user.l >= 3) {
			alert("You do not have permission to make new files.")
		} else {
			var newPath = node.path.split("/")
			var date = new Date()
			var year = date.getFullYear()
			
			var month = date.getMonth()+1
			month = month.toString()
			if (month.length == 1) {
				month = "0"+month
			}
			
			var day = date.getDate()
			day = day.toString()
			if (day.length == 1) {
				day = "0"+day
			}
			
			newPath[newPath.length-1] = year+month+day
			newPath = newPath.join("/")
			Wiki.file.newJournal(newPath).then(
			function(data) {
				Wiki.loader.reload();
			})
		}
	}
	,newDirectory:function() {
		if (Wiki.user.l >= 3) {
			alert("You do not have permission to make new directories.")
		} else {
			var name = prompt("Folder Name")
			if (name) {
				var newPath = node.path.split("/")
				newPath[newPath.length-1] = name
				newPath = newPath.join("/")
				Wiki.file.mkdir(newPath).then(
				function(data) {
					Wiki.loader.reload();
				})
			}
		}
	}
	,copyCurrent:function() {
		if (Wiki.user.l >= 3) {
			alert("You do not have permission to copy files.")
		} else {
			Wiki.file.copy(node).then(
			function(data) {
				Wiki.loader.reload();
			})
		}		
	}
	,deleteCurrent:function() {
		var ok = confirm("Delete this file? (This action cannot be undone)")
		console.log(ok)
		if (ok) {
			Wiki.file.remove(node.path).then(
			function(data) {
				location.assign(Wiki.serverURL+"home");
			})
		}
	}
	,collapseSidebar:function() {
		document.getElementById("sidebar").style.display = "none"
		document.getElementById("bodyWrapper").className = "wideBody"
		document.getElementById("expandSidebar").style.display = ""
	}
	,expandSidebar:function() {
		document.getElementById("sidebar").style.display = ""
		document.getElementById("bodyWrapper").className = "col-md-5"
		document.getElementById("expandSidebar").style.display = "none"
	}
	,serverURL:"/"
	
	
	/*
	,send:function(obj,callbackFunction) {
		var serverURL = Wiki.serverURL
		xhttp = new XMLHttpRequest();
		xhttp.open("POST", serverURL, true);
		xhttp.setRequestHeader("Content-type", "text/plain");
			
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {		
				if (callbackFunction) {
					callbackFunction()//JSON.parse(this.responseText))
				}
			}
		};
		xhttp.send(JSON.stringify(obj));
		//document.getElementById("log").innerHTML += "<BR>Trying to send..."

	},
	*/
	,sendRaw:function(data,callbackFunction) {
		var serverURL = Wiki.serverURL
		xhttp = new XMLHttpRequest();
		xhttp.open("POST", serverURL, true);
		xhttp.setRequestHeader("Content-type", "text/plain");
			
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				if (callbackFunction) {
					callbackFunction(this.responseText)
				}
			}
		};
		xhttp.send(data);		
	}
	,openPage(link) {
		if (Wiki.editing) {
			window.open(link, '_blank');
		} else {
			location.assign(link);
		}
	}
	,sendRawAsync:function(data) { //Returns a promise
		return new Promise(function(resolve,reject) {
			var serverURL = Wiki.serverURL
			xhttp = new XMLHttpRequest();
			xhttp.open("POST", serverURL, true);
			xhttp.setRequestHeader("Content-type", "text/plain");
				
			xhttp.onreadystatechange = function() {
				if (this.readyState == 4 && this.status == 200) {
					resolve(this.responseText)
				}
			};
			xhttp.send(data);
			
		})
	}
	,sendArray:function(arr,callbackFunction) {
		Wiki.sendRaw(Wiki.stringifyArray(arr),callbackFunction)
	}
	,stringifyArray:function(arr) { //Converts the array to a string seperated by new lines. Note that this only allows sending commands where the server knows the number of arguments.
		var out = arr.slice(0)	
		return out.join("\n")
	}	
	,wait:function(time) {
		var startTime = Date.now()
		while (Date.now()-startTime < time) {};
		return
	}
}