var Wiki = {
	setup:function() {		
		Wiki.currentPath = location.pathname.substr(1) //Remove the initial '/'
		//node = await Wiki.loader.readNode(currentPath,true)
		
		Wiki.title = node.title		
		if (!Wiki.title) {
			Wiki.title = ""
		}
		
		Wiki.subtitle = node.subtitle	
		if (!Wiki.subtitle) {
			Wiki.subtitle = ""
		}
		
		console.log(node)
		
		document.getElementById("settingsFilePath").value = node.path

		Wiki.runRuleList(Wiki.renderRules)
	}
	,runRuleList:function(ruleList) {
		for (var i = 0; i<ruleList.length; i++) {
			var rule = ruleList[i]
			if (!rule.disabled) {
				try {
					rule.rule();
				} catch(err) {
					console.log('ERROR IN RULE "'+rule.name+'":\t'+err)
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
	,renderRules:[ //These rules get executed in a top-down order: lower rules override higher rules.
		{ //Set title
			rule:function() {
				document.title = Wiki.title
			}
			,name:"default_title"
		}
		,{
			rule:function() {
				Wiki.getUserData(function(user) {
					Wiki.user = user
					Wiki.storage = Wiki.user.storage
					if (Wiki.user.l > 20 && !Wiki.loginAlert) {
						alert("Your session has expired. Reload the page to refresh the session.")
						Wiki.loginAlert = true
					}
				})
			}
			,name:"default_wikiuserinit"
		}
		,{
			rule:function() {
				setInterval(function() {
					Wiki.getUserData(function(user) {
						Wiki.user = user
						if (Wiki.user.l > 20 && !Wiki.loginAlert) {
							alert("Your session has expired. Reload the page to refresh the session.")
							Wiki.loginAlert = true
						}
					})
				},3*1000) //check login every 3 seconds.
			}
			,name:"default_setupuserupdatetimer"
		}
		,{
			rule:function() {
				if (node.timestamp) {
					document.getElementById("dateSpan").innerHTML = Wiki.formatTimestamp(node.timestamp)
				}
			}
			,name:"default_date"
		}
		,{
			rule:function() {		
				document.getElementById("pathDiv").innerHTML = "Wiki / "+node.path.split("/").join(" / ")
			}
			,name:"default_path"
		}
		,{
			name:"default_type"
			,rule:function() {		
				document.getElementById('typeDiv').innerHTML = Wiki.loader.typeMapper[node.type.toLowerCase()]
			}			
		}
		,{
			name:"default_setColor_dark"
			,rule:function() {
				Wiki.setPageColorByTheme_dark();				
			}
			,disabled:true
		}
		,{
			name:"default_setColor_light" //Do light setup by default
			,rule:function() {
				Wiki.setPageColorByTheme_light(); //This isn't exactly light, its "sidebar isn't different color than body"			
			}
			,disabled:false		
		}
		,{
			name:"default_setSmallScreensClasses"
			,rule:function() {
				if (window.innerWidth < 1500) {
					document.getElementById("bodyWrapper").className = "col-md-8"
					document.getElementById("sidebar").className = "col-md-3 sidebar"
				}
			}			
		}
		,{
			name:"default_setpagetitle"
			,rule:function() {
				document.getElementById('body').innerHTML = "<h1 class='pagetitle'>"+Wiki.title+"</h1><hr>"
			}			
		}
		,{
			name:"default_setup_wikipage_header"
			,rule:function() {
				if (node.type == "zappwiki" || node.type=="systemerror") {			
					document.getElementById('body').innerHTML = "<h1 class='pagetitle'>"+Wiki.title+"</h1><i>"+Wiki.subtitle+"</i>"
				}				
			}			
		}
		,{
			name:"default_setup_wikipage_body"
			,rule:function() {
				if (node.type == "zappwiki" || node.type=="systemerror") {			
					document.getElementById('body').innerHTML += "<hr>"+Wiki.parse(node.text)
				}				
			}			
		}
		,{
			name:"default_setup_imgpage"
			,rule:function() {
				if (Wiki.imageExtensions.indexOf(node.type) != -1) {
					document.getElementById('body').innerHTML += "<img src='/"+node.text+"' style='min-width:100px;image-rendering: optimizeSpeed;image-rendering: -moz-crisp-edges;image-rendering: -webkit-optimize-contrast;image-rendering: -o-crisp-edges;image-rendering: pixelated;-ms-interpolation-mode: nearest-neighbor;'></img>"
				}
			}
		}
		,{
			name:"default_setup_codepage"
			,rule:function() {
				if (Wiki.imageExtensions.indexOf(node.type) == -1 && node.type != "zappwiki" && node.type != "systemerror") {
					if (node.type == "txt") {
						document.getElementById('body').innerHTML += "<pre>"+Wiki.sanitizeCode(node.text)+"</pre>"
					} else {
						document.getElementById('body').innerHTML += (node.type == "html" ? "<a href='/"+Wiki.currentPath+".html'>View HTML</a><BR><BR>" : "")+"<pre style='background-color:inherit'><code class='"+node.type+"' style='overflow:scroll;white-space:unset;height:50vh;'>"+Wiki.sanitizeCode(node.text)+"</code></pre>"
						Wiki.shouldHighlight = true
					}
				}				
			}			
		}
		,{
			name:"default_highlightinit"
			,rule:function() {
				if (Wiki.shouldHighlight) {
					$('pre code').each(function(i, block) {
						hljs.highlightBlock(block);
					});
				}				
			}		
		}	
	]
	,pageColorSet:false
	,setAutomaticStylingMode(mode) {//possible values for mode: "dark", "light", "off"
		var dark = false
		var light = true
		if (mode == "dark") {
			dark = true
			light = false
		} else if (mode == "light") {
			dark = false			
			light = true
		} else if (mode == "off") {
			dark = false
			light = false
		}
		Wiki.getRule(Wiki.renderRules,"default_setColor_dark").disabled = !dark
		Wiki.getRule(Wiki.renderRules,"default_setColor_light").disabled = !light
	}
	,setPageColorByTheme_dark:function() {
		if (!Wiki.pageColorSet) {
			//Set the background color of the body to the color of the text. this allows users to use their favorite bootstrap theme while making it still look nice automatically.
			var innerBackgroundColor = window.getComputedStyle( document.body ,null).getPropertyValue('background-color');
			document.getElementById("bodyWrapper").style.backgroundColor = innerBackgroundColor
			var computedColor = window.getComputedStyle( document.body ,null).getPropertyValue('color')
			document.body.style.backgroundColor = computedColor; 
			
			Wiki.setFileFontStyleByTheme();
			
			Wiki.pageColorSet = true;
		}
	}
	,setPageColorByTheme_light:function() {
		if (!Wiki.pageColorSet) {
			var innerBackgroundColor = window.getComputedStyle( document.body ,null).getPropertyValue('background-color');
			document.getElementById("bodyWrapper").style.backgroundColor = innerBackgroundColor
			
			var innerBackgroundColorSplit = innerBackgroundColor.split(/[,\(\)]/);
			var darkenFactor = 0.90
			var r = parseFloat(innerBackgroundColorSplit[1])
			var g = parseFloat(innerBackgroundColorSplit[2])
			var b = parseFloat(innerBackgroundColorSplit[3])
			var darkened = "rgb("+(r*darkenFactor)+","+(g*darkenFactor)+","+(b*darkenFactor)+")"
			
			
			document.body.style.backgroundColor = darkened; 
			
			Wiki.setFileFontStyleByTheme();

			
			Wiki.pageColorSet = true;
		}
	}
	,setFileFontStyleByTheme:function() {
		
		if (!Wiki.pageColorSet) {
			var innerBackgroundColor = window.getComputedStyle( document.body ,null).getPropertyValue('background-color');
			
			var innerBackgroundColorSplit = innerBackgroundColor.split(/[,\(\)]/);
			var r = parseFloat(innerBackgroundColorSplit[1])
			var g = parseFloat(innerBackgroundColorSplit[2])
			var b = parseFloat(innerBackgroundColorSplit[3])
			
			var darkPage;
			
			if (((r+g+b)/3) < 110) {
				darkPage = true
			} else {
				darkPage = false
			}
			
			var color
			var hoverColor
			if (darkPage) {
				color = "white"
				hoverColor = "#ddd"				
			} else {
				color = "#555"
				hoverColor = "#222"
				
			}
			
			
			
			document.getElementById("mainStyle").innerHTML += `
			label>a {
				color:${color};	
			}

			label>a:hover {
				color:${hoverColor};
				text-decoration:none;
			}

			li.file a {
				color: ${color};	
			}

			li.file a:hover
			{
				color:${hoverColor};
			}

			li.currentFile
			{ 
				text-decoration-color:${color};
			}

			li.currentFile a:hover
			{ 
				color:${color};
			}`
			
		}		
	}
	,showPopdown(text) {
		document.getElementById("popdown").innerHTML = text
		document.getElementById("popdown").classList.remove("popdown-animation")
		setTimeout(function() {
			document.getElementById("popdown").classList.add("popdown-animation")
		},10)
	}
	,imageExtensions:[
		"png"
		,"jpg"
		,"bmp"
		,"jpeg"
	]
	,sanitizeCode:function(code) {
		code = code.replace(/</g,"&lt;")
		code = code.replace(/>/g,"&gt;")
		return code
	}
	,includeScript(fileName) {
		var script   = document.createElement("script");
		script.type  = "text/javascript";
		script.src   = fileName;
		document.body.appendChild(script);
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
				
			}
			if (!inRaw) {
				for (var r = 0; r<Wiki.rules.length; r++) {
					var rule = Wiki.rules[r]
					var ruleAllowed = filter.indexOf(rule.name) != -1
					ruleAllowed = ruleAllowed != invert //XOR invert and ruleAllowed
					if (ruleAllowed) {
						var start = rule.start
						var parse = rule.parse
						var end = rule.end || rule.start
						
						var startText = Wiki.testMatch(start,i,markup)
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
									endText = Wiki.testMatch(end,j,markup)
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
		if (inP) {
			html += "</p>"
		}
		return html
	}
	,testMatch(obj,index,str) { //obj can be a string,  a RegExp, or a function. Returns the match, or undefined
		var afterIndex = str.substr(index)
		if (typeof obj == "string") {
			var current = afterIndex.substr(0,obj.length)
			if (current == obj) {
				return obj
			}
		} else if (obj instanceof RegExp) {
			var matchLoc = afterIndex.search(obj)
			if (matchLoc == 0) {
				var match = obj.exec(afterIndex)
				return match[0] //Match is an array
			}
		} else if (typeof obj == "function") {
			//todo
		}
		//return undefined
	}
	,singleLine:["paragraph","hr","initialLinebreak"]
	,rules:[
		{
			start:/\n!+/
			,end:"\n"
			,parse:function(markup,start,end) { //markup is only the inner text
				var headingNumber = start.length-1 //-1 is to account for the 
				return "<h"+headingNumber+">"+Wiki.parse(markup,Wiki.singleLine,true)+"</h"+headingNumber+">"
			}
			,dontSkipEnd:true //Whether or not to skip the end token. Needs to be false for toggle rules like bold, italic, etc, but needs to be true here.
			,closeParagraph:true
		}
		,{
			start:"```"
			,parse:function(markup,start,end) {
				var firstLineEnd = markup.indexOf("\n")
				var codeType = ""
				if (firstLineEnd != -1) {
					codeType = markup.substr(0,firstLineEnd)
				}
				
				if (codeType == "") {
					return "<pre>"+Wiki.sanitizeCode(markup)+"</pre>"
				} else {
					Wiki.shouldHighlight = true
					return "<pre style='background-color:inherit'><code class='"+codeType+"' style='overflow:scroll;white-space:unset;height:50vh;'>"+Wiki.sanitizeCode(markup.substr(firstLineEnd+1))+"</code></pre>"
				}				
			}
			,closeParagraph:true
		}
		,{
			name:"list"
			,start:/\n([\*#>]+)/ //used to start with \n \n
			,end:/\n[^\*#>\s]/
			,parse:function(markup,start,end) {
				var html = ""
				
				markup = start+markup //We need the first bullet stuff
				var lines = []
				var currentLine = ""
				var inRaw = false
				var k = 0;
				while (k<markup.length) {
					var character = markup.substr(k,1)
					if (markup.substr(k,2) == "@@") {
						inRaw = !inRaw
						k+=2
						currentLine += "@@"
					} else if (character == "\n" && !inRaw) {
						lines.push(currentLine)
						currentLine = ""
						k++
					} else {
						currentLine+=character;
						k++
					}
				}
				lines.push(currentLine)
				
				var	toClose = [] //Tags left to close
				for (var i = 0; i<lines.length; i++) {
					var line = lines[i]
					if (line.match(/\S/)) {
						var lineTextStart = line.search(/[^\*#>\s]/)
						if (lineTextStart != -1) {
							var indentStr = line.substr(0,lineTextStart).replace(/\s/,"")
							var lineText = line.substr(lineTextStart)
							var expectedToClose = []
							for (var j = 0; j<indentStr.length; j++) {
								if (indentStr[j] == "*") {
									expectedToClose.push("ul")
								} else if (indentStr[j] == "#") {
									expectedToClose.push("ol")
								} else if (indentStr[j] == ">") {
									expectedToClose.push("blockquote")
								}
							}
							
							var expectedToCloseLength = expectedToClose.length
							var toCloseLength = toClose.length
							
							if (expectedToCloseLength > toCloseLength) {
								for (var k = toCloseLength; k<expectedToCloseLength; k++) {
									toClose.push(expectedToClose[k])
									if (expectedToClose[k] == "blockquote") {
										html += "<blockquote style='font-size:inherit'>"
									} else {
										html += "<"+expectedToClose[k]+">"
									}
								}
							} else if (toCloseLength > expectedToCloseLength) {
								for (var k = toCloseLength-1; k>=expectedToCloseLength; k--) {
									html += "</"+toClose.pop()+">"
								}
							}
							if (expectedToClose[expectedToClose.length-1] == "blockquote") {
								html += "<p>"+Wiki.parse(lineText,Wiki.singleLine,true)+"</p>"
							} else {
								html += "<li>"+Wiki.parse(lineText,Wiki.singleLine,true)+"</li>"
							}
						} else {
							console.log("There's a bug!") //This is never supposed to happen.
						}
					}					
				}
				var toCloseLength = toClose.length
				for (var l = toCloseLength-1; k>=0; k--) {
					html += "</"+toClose[k]+">"
				}
				return html
			}
			,dontSkipEnd:true
			,closeParagraph:true
		}
		/*
		,{	
			name:"paragraph"
			,start:/\n\n/
			,end:/\n\n/
			,parse:function(markup,start,end) {
				var textStart = markup.search(/\S/g)
				if (textStart != -1) {
					this.postInsert = "\n\n"
					if (this.lineStartRules.indexOf(markup.substr(textStart,1)) == -1) { //If it is not one of the line start rules...
						return "<p>"+Wiki.parse(markup)+"</p>"
					} else {
						return Wiki.parse("
"+markup.substr(textStart))
					}
				} else {
					this.postInsert = ""
					return ""
				}				
			}
			,postInsert:"\n\n"
			,dontSkipEnd:true
			,lineStartRules:["!","#","*"]
		}
		*/
		,{
			start:/\n[:;]/
			,end:/\n[^:;\s]/
			,dontSkipEnd:true
			,closeParagraph:true
			,parse:function(markup,start,end) {
				var html = "<dl>"
				markup = start+markup
				
				var lines = markup.split("\n")
				for (var i = 0; i<lines.length; i++) {
					var line = lines[i]
					var textStart = line.search(/\S/)
					if (textStart != -1) {
						var text = line.substr(textStart)
						var parsed = Wiki.parse(text.substr(1),Wiki.singleLine,true)
						if (text.substr(0,1) == ":") {
							html += "<dd>"+parsed+"</dd>"
						} else {
							html += "<dt>"+parsed+"</dt>"
						}
					}
				}
				
				html += "</dl>"
				
				return html
			}
		}
		,{
			start:"''"
			,parse:function(markup) {
				return "<b>"+Wiki.parse(markup,Wiki.singleLine,true)+"</b>"
			}
		}
		,{
			start:"//"
			,parse:function(markup) {
				return "<i>"+Wiki.parse(markup,Wiki.singleLine,true)+"</i>"
			}
		}
		,{
			start:"__"
			,parse:function(markup) {
				return "<u>"+Wiki.parse(markup,Wiki.singleLine,true)+"</u>"
			}
		}
		,{
			start:"``"
			,parse:function(markup) {
				return "<code>"+Wiki.sanitizeCode(markup)+"</code>"
			}
		}
		,{
			start:"^^"
			,parse:function(markup) {
				return "<sup>"+Wiki.parse(markup,Wiki.singleLine,true)+"</sup>"
			}
		}
		,{
			start:",,"
			,parse:function(markup) {
				return "<sub>"+Wiki.parse(markup,Wiki.singleLine,true)+"</sub>"
			}
		}
		,{
			start:"~~"
			,parse:function(markup) {
				return "<s>"+Wiki.parse(markup,Wiki.singleLine,true)+"</s>"
			}
		}
		,{
			start:"$$"
			,parse:function(markup) {
				var evaled = ""
				try {
					evaled = eval(markup)
				} catch(err) {
					evaled = ""
				}
				return evaled
			}
			,allowZeroWidthSpaces:true
			,allowRaw:false //Do this so you can actually have an @@ inside a $$ string
		}
		,{
			start:'\n"""'
			,parse:function(markup) {
				var lines = markup.split("\n")
				for (var i =0; i<lines.length; i++) {
					lines[i] = Wiki.parse("\n"+lines[i],Wiki.singleLine,true)
				}
				return lines.join("<BR>")
			}
		}
		
		,{
			start:"[["
			,end:"]]"
			,parse:function(markup) {
				var args = markup.split("|")			
				if (args.length==0) {
					//markup error
				} else if (args.length == 1) {
					return "<a href='"+args[0]+"'>"+args[0]+"</a>"
				} else if (args.length == 2) {
					return "<a href='"+args[1]+"'>"+Wiki.parse(args[0],Wiki.singleLine,true)+"</a>"
				} else if (args.length == 3) {
					var tag = args[0]
					if (tag == "img") {
						return "<img src='"+args[1]+"'></img><i>"+Wiki.parse(args[2],Wiki.singleLine,true)+"</i>"
					}
				}
			}
		}
		,{
			start:"[img["
			,end:"]]"
			,parse:function(markup) {
				return "<img src='"+markup+"' style='max-width:100%;display:block;margin:0 auto;'></img>"	
			}		
		}
		,{
			start:"---"
			,end:/[\S\s]/
			,parse:function(markup,start,end) {
				return "&mdash;"
			}
			,dontSkipEnd:true
		}
		,{
			start:"--"
			,end:/[\S\s]/
			,parse:function(markup,start,end) {
				return "&ndash;"
			}
			,dontSkipEnd:true
		}		
		,{
			start:/\n(-{3,})/
			,end:/\n/
			,name:"hr"
			,parse:function() {
				return "<hr>"
			}
			,dontSkipEnd:true
		}
	]
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
			document.getElementById("texteditwrapper").innerHTML = ""
			Wiki.wysiwygEditor = new Wiki.editor(document.getElementById("texteditwrapper"),html)
			Wiki.wysiwygEditor.addStandardButtons();
			Wiki.wysiwyg = true
		}
	}
	,updateEditClasses:function() {
		if (Wiki.editing) {
			document.getElementById("editbuttonicon").className = "fa fa-fw fa-check"
			document.getElementById("editbuttonicon_expand").className = "fa fa-fw fa-check"
			document.getElementById("cancelButton").style.display = ""
			document.getElementById("cancelButton_expandSidebar").style.display = ""
			document.getElementById("settingsButton").style.display = ""
			document.getElementById("deleteButton").style.display = ""
		} else {
			document.getElementById("editbuttonicon").className = "fa fa-fw fa-pencil"
			document.getElementById("editbuttonicon_expand").className = "fa fa-fw fa-pencil"
			document.getElementById("cancelButton").style.display = "none"
			document.getElementById("cancelButton_expandSidebar").style.display = "none"
			document.getElementById("settingsButton").style.display = "none"
			document.getElementById("deleteButton").style.display = "none"
		}
	}
	,cancelEdit:function(){
		Wiki.loader.reload()
	}
	,editCurrent:function() {
		Wiki.runRuleList(Wiki.editRules);
	}
	,editRules:[
		{
			name:"default_checklocked"
			,rule:function() {
				if (node.locked) {
					var shouldEdit = confirm("File is locked. Are you sure you want to edit it?");
					if (!shouldEdit) {
						Wiki.cancelEdit();
					}
				}				
			}			
		}
		,{
			name:"default_checkpermissions"
			,rule:function() {
				if (Wiki.user.l >= 3) {
					alert("You do not have permission to edit this file.")
					Wiki.cancelEdit();					
				}				
			}			
		}
		,{
			name:"default_addsaveshortcut"
			,rule:function() {
				window.addEventListener("keydown",function(event) {
					if (event.key == "s" && event.ctrlKey) {
						var wysiwyg = Wiki.wysiwyg
						Wiki.saveNoReload();
						event.preventDefault();
						console.log("Saved page.")
						if (Wiki.wysiwyg != wysiwyg) {
							Wiki.toggleWYSIWYG();
						}
					}
				})				
			}			
		}
		,{
			name:"default_edit_bodyinit"
			,rule:function() {
				Wiki.body = document.getElementById("body")
			}			
		}
		,{
			name:"default_edit_wikipage_setup_addheader"
			,rule:function() {
				if (node.type == "zappwiki") {
					Wiki.body.innerHTML = 
					"<h1 class='pagetitle'><input id='titleedit' class='headerInput' type='text' style='width:100%;height:80px;'></input></h1><BR><i><input id='subtitleedit' class='headerInput' style='width:100%'></input></i><BR><BR>"
				}
			}
		}
		,{
			name:"default_edit_wikipage_setup_addwysiwygbutton"
			,rule:function() {
				if (node.type == "zappwiki") {
					Wiki.body.innerHTML +="<BR><a onclick='Wiki.toggleWYSIWYG()' id='wysiwygToggle' style='cursor:pointer'>WYSIWYG</a>"
				}
			}
		}		
		,{
			name:"default_edit_wikipage_setup_addbody"
			,rule:function() {
				if (node.type == "zappwiki") {
					Wiki.body.innerHTML += 
					"<hr><div id='texteditwrapper'><textarea id='textedit' style='width:100%'></textarea></div><BR><BR>"
					+"<h2>Include</h2><textarea style='width:100%' id='includeedit'></textarea><h2>Scripts</h2><h3>Preload</h3><div class='isResizable' id='preloadeditWrapper'><textarea style='width:100%' id='preloadedit'></textarea></div><h3>Postload</h3><textarea style='width:100%' id='postloadedit'></textarea>"
				}
			}
		}
		,{
			name:"default_edit_wikipage_setup"
			,rule:function() {
				if (node.type=="zappwiki") {
					//The scripts and include stuff probably never happen because the same thing happens in the loader...
					if (!node.postload) {
						node.postload = ""
					}
					if (!node.include) {
						node.include = ""
					}
					if (!node.preload) {
						node.preload = ""
					}
					if (!node.subtitle) {
						node.subtitle = ""
					}
					
					document.getElementById("titleedit").value = node.title
					document.getElementById("subtitleedit").value = node.subtitle
					document.getElementById('textedit').value = node.text
					Wiki.autoGrow(document.getElementById('textedit'))
					
					document.getElementById('postloadedit').value = node.postload
					document.getElementById('includeedit').value = node.include
					document.getElementById('preloadedit').value = node.preload
					
					//Wiki.autoGrow(document.getElementById('postloadedit'))
					Wiki.autoGrow(document.getElementById('includeedit'))
					//Wiki.autoGrow(document.getElementById('preloadedit'))
					
					if (CodeMirror) {
						var config = {
							lineNumbers:true
                          	,indentWithTabs:true
                          	,indentUnit:4
							,mode:"javascript"
						}
						Wiki.codeMirrorPostloadEdit = CodeMirror.fromTextArea(document.getElementById('postloadedit'),config);
						Wiki.codeMirrorPreloadEdit = CodeMirror.fromTextArea(document.getElementById('preloadedit'),config);
						setInterval(Wiki.updateEditorSizes,200)
					}
				}				
			}
		}
		,{
			name:"default_edit_wikipage_setup_settings"
			,rule:function() {
				if (node.type=="zappwiki") {
					if (typeof node.includePath == "undefined") {
						node.includePath = "system/config/include.txt"						
					}
					
					document.getElementById("includePathEdit").value = node.includePath
					
					if (!node.locked) {
						node.locked = false;
					}
					
					document.getElementById("lockFileBox").checked = node.locked
				}				
			}			
		}
		,{
			name:"default_edit_imgpage"
			,rule:function() {
				if (Wiki.imageExtensions.indexOf(node.type) != -1) {
					alert("Editing images is currently not supported.")
					Wiki.editing = false
					Wiki.updateEditClasses()
				}
			}
		}
		,{
			name:"default_edit_codepage"
			,rule:function() {
				if (node.type != "zappwiki" && Wiki.imageExtensions.indexOf(node.type) == -1) {
					Wiki.body.innerHTML = "<h1 class='pagetitle'>"+node.title+"</h1><div style='border:1px solid gray;'><textarea id='textedit' style='width:100%'></textarea></div>"
					document.getElementById('textedit').value = node.text
					Wiki.autoGrow(document.getElementById('textedit'))
					if (CodeMirror) {
						var modeMapper = {
							"html":"text/html"
							,"css":"css"
							,"js":"javascript"				
						}
						
						
						var config = {
							lineNumbers:true
                          	,indentWithTabs:true
                          	,indentUnit:4
							,mode:modeMapper[node.type]
						}
						Wiki.codeMirrorTextEdit = CodeMirror.fromTextArea(document.getElementById('textedit'),config);
						Wiki.codeMirrorTextEdit.setSize(null,"90vh")
					}
				}
			}			
		}
		,{
			name:"default_readprefs_defaulteditmode"
			,rule:function() {
				if (node.type == "zappwiki") {
					var pref = Wiki.getPref("core-editor-defaulteditmode")
					if (pref == "wysiwyg") {
						Wiki.toggleWYSIWYG();
					}
				}
			}			
		}
	]
	,updateEditorSizes:function() {
		if (Wiki.codeMirrorPreloadEdit) {
			var w = window.getComputedStyle(document.getElementById("preloadeditWrapper")).width
			var h = window.getComputedStyle(document.getElementById("preloadeditWrapper")).height
			Wiki.codeMirrorPreloadEdit.setSize(w,h)
			Wiki.codeMirrorPreloadEdit.refresh()
		}
	}
	,saveNoReload() {
		if (Wiki.editing) {
			Wiki.runRuleList(Wiki.saveRules);
			Wiki.showPopdown("Saved page.")
			Wiki.command({cmd:"save",node:node})
		}
	}
	,saveCurrent:function() {
		Wiki.runRuleList(Wiki.saveRules);
		
		var newPath = document.getElementById("settingsFilePath").value
		
		Wiki.command({cmd:"save",node:node}).then(
		function(data) {
			if (newPath != node.path) {
				Wiki.command({cmd:"move",oldPath:node.path,newPath:newPath}).then(function() {
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
		Wiki.fs.saveStorage(callback)		
	}
	,setPref(pref,val) {
		Wiki.setStorage("PREFERENCES",pref,val);
	}
	,getPref(pref) {
		return Wiki.getStorage("PREFERENCES",pref);
	}
	,preferences:[
		{
			name:"core-editor-defaulteditmode",
			description:"Set this to 'wysiwyg' to make pages open in WYSIWYG mode by default. Set this to 'markup' or any other value to make pages open in markup mode by default."
			,options:[
				["wysiwyg","Use WYSIWYG editor by default."]
				,["markup","User markup editor by default."]
			]
		}
	]
	,saveRules:[
		{
			name:"default_save_savecodemirror"
			,rule:function() {
				if (Wiki.codeMirrorTextEdit) {
					Wiki.codeMirrorTextEdit.save()
				} else if (Wiki.codeMirrorPostloadEdit) {
					Wiki.codeMirrorPostloadEdit.save();
					Wiki.codeMirrorPreloadEdit.save();
				}								
			}
		}
		,{
			name:"default_save_wysiwyg"
			,rule:function() {
				if (Wiki.wysiwyg) {
					node.text = Wiki.wysiwygEditor.html
				}
			}			
		}
		,{
			name:"default_save_text"
			,rule:function() {
				if (!Wiki.wysiwyg) {
					node.text = document.getElementById('textedit').value
				}				
			}
		}
		,{
			name:"default_save_wikipage"
			,rule:function() {
				if (node.type == "zappwiki") {
					node.title = document.getElementById("titleedit").value
					node.subtitle = document.getElementById("subtitleedit").value
					node.postload = document.getElementById('postloadedit').value
					node.include = document.getElementById('includeedit').value
					node.preload = document.getElementById('preloadedit').value
					
					if (!node.subtitle) {
						delete node.subtitle
					}
					
					if (!node.postload) {
						delete node.postload
					}
					
					if (!node.include) {
						delete node.include
					}
					
					if (!node.preload) {
						delete node.preload
					}
				}
			}
		}
		,{
			name:"default_save_wikipage_settings"
			,rule:function() {
				if (node.type == "zappwiki") {
					node.includePath = document.getElementById("includePathEdit").value
					if (node.includePath == "system/config/include.txt") {
						delete node.includePath
					}
					
					node.locked = document.getElementById("lockFileBox").checked
					if (!node.locked) {
						node.locked = false;
					}				
				}	
			}		
		}
	]
	,newFile:function() {
		if (Wiki.user.l >= 3) {
			alert("You do not have permission to make new files.")
		} else {
			var name = prompt("File Name")
			if (name) {
				var newPath = node.path.split("/")
				newPath[newPath.length-1] = name
				newPath = newPath.join("/")
				Wiki.command({cmd:"new",path:newPath}).then(
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
			Wiki.command({cmd:"newJournal",path:newPath}).then(
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
				Wiki.command({cmd:"mkdir",path:newPath}).then(
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
			Wiki.command({cmd:"copy",node:node}).then(
			function(data) {
				Wiki.loader.reload();
			})
		}		
	}
	,deleteCurrent:function() {
		var ok = confirm("Delete this file? (This action cannot be undone)")
		console.log(ok)
		if (ok) {
			Wiki.command({cmd:"delete",path:node.path}).then(
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
	,command:async function(obj) {
		var fs = Wiki.fs
		if (obj.cmd == "save") {
			console.log("Got save command: "+obj.node.path)
			console.log("Type: "+obj.node.type)
			if (obj.node.type == "zappwiki") {
				var nodeCopy = JSON.parse(JSON.stringify(obj.node))
				
				/*
				nodeCopy.text = nodeCopy.text.split("\n") //Save it this way so git diffs are useful
				
				
				if (nodeCopy.preload) nodeCopy.preload = nodeCopy.preload.split("\n");
				if (nodeCopy.postload) nodeCopy.postload = nodeCopy.postload.split("\n");
				if (nodeCopy.include) nodeCopy.include = nodeCopy.include.split("\n");
				*/
				delete nodeCopy.path //Dont save the path			
				
				nodeCopy.format = "ZWP v3"
				
				var data = JSON.stringify(nodeCopy)
				/*
				data = data.replace(/\,/g,"\n,")
				data = data.replace(/\{/g,"{\n")
				data = data.replace(/\}/g,"\n}")
				data = data.replace(/\[/g,"[\n")
				data = data.replace(/\]/g,"\n]")
				*/
				await fs.writeFileAsync(obj.node.path,data)
			} else {
				await fs.writeFileAsync(obj.node.path,obj.node.text.join("\n"))
			}
		} else if (obj.cmd == "new") {
			await Wiki.makeNewPage(obj.path)
		} else if (obj.cmd == "newJournal") {
			await Wiki.makeNewJournalPage(obj.path)
		} else if (obj.cmd == "mkdir") {
			if (!(await fs.existsAsync(obj.path))) {
				console.log("Making directory: "+obj.path)
				await fs.mkdirAsync(obj.path)
				await Wiki.makeNewPage(obj.path+"/index") //Make a new page so there is something in the directory to start from.
			}		
		} else if (obj.cmd == "delete") {
			if (await fs.existsAsync(obj.path)) {
				await Wiki.deletePath(obj.path)
			}
		} else if (obj.cmd == "copy") {	
			var path = obj.node.path
			while (await fs.existsAsync(path)) {
				path = path.split(".")
				path[path.length-2] += " Copy"
				path = path.join(".")
			}
			if (obj.node.type == "zappwiki") {
				var data = JSON.stringify(obj.node)
				await fs.writeFileAsync(path,data)
			} else {
				await fs.writeFileAsync(path,obj.node.text)
			}
		} else if (obj.cmd == "move") {
			var oldType = Wiki.getType(obj.oldPath)
			var newType = Wiki.getType(obj.newPath)
			//TODO: have something check for overwrites
			if (oldType != newType) {
				if (newType == "zappwiki") { //old type must have been something else
					var oldData = await fs.readFileAsync(obj.oldPath,"utf8")
					var oldName = Wiki.getName(obj.oldPath)
					var newPage = {
						type:"zappwiki"
						,title:oldName
						//,path:obj.newPath
						,text:oldData.split("\n") //See above for why this is line-saved
					}
					
					await fs.writeFileAsync(obj.newPath,JSON.stringify(newPage))
				} else { //going from zappwiki to something else
					var oldData = await Wiki.loader.readNode(obj.oldPath,false)
					var text = oldData.text
					await fs.writeFileAsync(obj.newPath,text)
				}
				await fs.unlinkAsync(obj.oldPath) //Delete the old file.
			} else {
				await fs.renameAsync(obj.oldPath,obj.newPath)
			}
		}
	}
	,getType:function(path) {
		var split = path.split(".")
		return split[split.length-1]
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
	,deletePath:async function(path) {
		//Note that path is a path inside the wiki
		console.log("Deleting: "+path)
		
		var fs = Wiki.fs
		
		var actualPath = path
		var stats = await fs.statAsync(actualPath)
		if (stats.isDirectory()) {
			await fs.rmdirAsync(actualPath)
		} else {
			await fs.unlinkAsync(actualPath)
		}
		
		//console.log("typeof path: "+typeof path)
		var parentPath = path.split("/");
		parentPath.pop()
		parentPath = parentPath.join("/")
		var dir = await fs.readdirAsync(parentPath)
		if (dir.length == 0) { //If there is nothing left in the directory...
			deletePath(parentPath) //TODO: will calling this recursively possibly cause race conditions? (i.e., the parent dir gets deleted before stuff inside it finishes or something?)
		}	
	}
	,makeNewPage:async function(path) {
		var newPage = {
			title:"New Wiki Page"
			,text:""
			//,path:path
			,type:"zappwiki"		
		}
		
		var fs = Wiki.fs
		
		if (!await fs.existsAsync(path)) { //don't overwrite
			await fs.writeFileAsync(path+".zappwiki",JSON.stringify(newPage))	
		}
	}

	,makeNewJournalPage:async function(path) {		
		var date = new Date()
		var day = date.getDate();
		
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
		
		
		var title = month+" "+day+", "+year
		var newPage = {
			title:title
			,text:""
			//,path:path
			,type:"zappwiki"		
		}
		
		var fs = Wiki.fs
		
		if (!await fs.existsAsync(path)) { //don't overwrite
			await fs.writeFileAsync(path+".zappwiki",JSON.stringify(newPage))	
		}
	}
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
	,logout:function() {
		Wiki.sendRaw("LOGOUT",function() {
			location.assign("/home")
		})
	}
	,getUserData:function(callback) {
		Wiki.sendRaw("USERDATA",function(res) {
			callback(JSON.parse(res))
		})		
	}
	,fsWrappers:{
		standard:{ //Functions for a standard server with no additional authentication, signatures, etc.
			writeFile:function(path,data,encoding,callback) { 
				if (!encoding) {
					encoding = "utf8"
				}
			
				Wiki.sendArray(["WRITE",path,encoding,data],function(res) {
					callback(undefined,res) //Undefined takes place of error
				})
			}
			,readFile:function(path,encoding,callback) {
				if (!encoding) {
					encoding = "utf8"
				}
				
				Wiki.sendArray(["READ",path,encoding],function(res) {
					callback(undefined,res.replace(/\r\n/g,"\n"))
				})
			}
			,stat:function(path,callback) {
				Wiki.sendArray(["STAT",path],function(data) {
					class FsStats {
						constructor(statArray) {
							var indexNames = [
								"dev"
								,"ino"
								,"mode"
								,"nlink"
								,"uid"
								,"gid"
								,"rdev"
								,"size"
								,"blksize"
								,"blocks"
							]

							for (var i = 0; i<indexNames.length; i++) {
								this[indexNames[i]] = statArray[i]
							}
							
							this.atime = new Date(parseInt(statArray[indexNames.length]))
							this.mtime = new Date(parseInt(statArray[indexNames.length+1]))
							this.ctime = new Date(parseInt(statArray[indexNames.length+2]))
							this.birthtime = new Date(parseInt(statArray[indexNames.length+3]))
							
							this.isFileVal = statArray[indexNames.length+4] == "true"
							this.isDirectoryVal = statArray[indexNames.length+5] == "true"
						}
						
						isFile() {
							return this.isFileVal
						}
						
						isDirectory() {
							return this.isDirectoryVal
						}
					}
					
					data = data.split(",")
					var stat = new FsStats(data)
					
					callback(undefined,stat)
				})
			}
			,readdir:function(path,callback) {
				Wiki.sendArray(["READDIR",path],function(data) {
					data = data.split(",")
					callback(undefined,data)
				})
			}
			,rename:function(oldpath,newpath,callback) {
				Wiki.sendArray(["RENAME",oldpath,newpath],function(err) {
					callback(err)
				})
			}
			,mkdir:function(path,callback) {
				Wiki.sendArray(["MKDIR",path],function(err) {
					callback(err)
				})
			}
			,rmdir:function(path,callback) {
				Wiki.sendArray(["RMDIR",path],function(res) {
					callback(undefined,res)
				})
			}
			,unlink:function(path,callback) {
				Wiki.sendArray(["UNLINK",path],function(res) {
					callback(undefined,res)
				})
			}
			,exists:function(path,callback) { //this is deprecated in node. have it here because it needs to be async anyway because of xhttp
				Wiki.sendArray(["EXISTS",path],function(data) {
					callback(data == "true")
				})
			}
			,addRemote:function(name,path,callback) { //Note these synchronization commands require an auth level of 0 for adding remotes and 1 for syncing
				Wiki.sendArray(["ADDREMOTE",name,path],function() {
					callback();
				})
			}
			,removeRemote:function(name,path,callback) {
				Wiki.sendArray(["REMOVEREMOTE",name,path],function() {
					callback();
				})
			}
			,getRemotes:function(callback) {
				Wiki.sendArray(["GETREMOTES"],function(data) {
					callback(JSON.parse(data));
				})
			}
			,sync:function(callback) {
				Wiki.sendArray(["SYNC"],function(data) {
					callback(data);
				})
			}
			,saveStorage(callback) {
				Wiki.sendArray(["SAVESTORAGE",JSON.stringify(Wiki.storage)],callback);
			}
			,setPreload(data,callback) {
				Wiki.sendArray(["SETPRELOAD",data],callback);
			}
			,setPostload(data,callback) {
				Wiki.sendArray(["SETPOSTLOAD",data],callback);
			}
		}		
	}
	,setFsWrapper:function(mode) {
		Wiki.fsWrapper = Wiki.fsWrappers[mode]
		
		var keys = Object.keys(Wiki.fsWrapper);
		for (var i = 0; i<keys.length; i++) {
			var key = keys[i]
			Wiki.fs[key]=Wiki.fsWrapper[key]		
		}
	}
	,fs:{
		//Note that these all return Promises, so they can be used with await.
		writeFileAsync(path,data,encoding) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.writeFile(path,data,encoding,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})			
		}
		,readFileAsync(path,encoding) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.readFile(path,encoding,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})
		}
		,statAsync(path) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.stat(path,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})
		}
		,readdirAsync(path) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.readdir(path,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})
		}
		,renameAsync(oldpath,newpath) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.rename(oldpath,newpath,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})
		}
		,mkdirAsync(path) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.mkdir(path,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})
		}
		,rmdirAsync(path) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.rmdir(path,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})
		}
		,unlinkAsync(path) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.unlink(path,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})
		}
		,existsAsync(path) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.exists(path,function(res) {
				resolve(res)
			})})
		}
		,setPreloadAsync(data) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.setPreload(data,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})
		}
		,setPostloadAsync(data) {
			return new Promise(function(resolve,reject) {
			Wiki.fs.setPostload(data,function(err,res) {
				if (err) {
					reject(err)
				} else {
					resolve(res)
				}
			})})
		}
	}
	,wait:function(time) {
		var startTime = Date.now()
		while (Date.now()-startTime < time) {};
		return
	}
}

Wiki.setFsWrapper("standard")

