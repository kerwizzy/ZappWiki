//Wiki.singleLine and Wiki.parse are in client.js instead of here because they are used so often.
Wiki.parser = {
	testMatch(obj,index,str) { //obj can be a string,  a RegExp, or a function. Returns the match, or undefined
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
					return "<pre>"+Wiki.utils.sanitizeCode(markup)+"</pre>"
				} else {
					Wiki.shouldHighlight = true
					return "<pre style='background-color:inherit'><code class='"+codeType+"' style='overflow:scroll;white-space:unset;height:50vh;'>"+Wiki.utils.sanitizeCode(markup.substr(firstLineEnd+1))+"</code></pre>"
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
				return "<code>"+Wiki.utils.sanitizeCode(markup)+"</code>"
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
}