Wiki.setup = {
rules:[ //These rules get executed in a top-down order: lower rules override higher rules.
	{
		rule:function() {
			console.log(node)
		}
		,name:"default_printnode"
	}
	,{
		rule:function() {
			Wiki.currentPath = location.pathname.substr(1)
		}
		,name:"default_setwikicurrentpath"
	}
	,{
		rule:function() {
			Wiki.file.getUserData().then(function(user) {
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
		name:"default_setsidebarusername"
		,rule:function() {
			Wiki.file.getUserData().then(function(user) {
				document.getElementById("sidebarUsername").innerHTML = user.username
			})
		}		
	}
	,{
		rule:function() {
			setInterval(function() {
				Wiki.file.getUserData().then(function(user) {
					if (user.l > 20 && !Wiki.loginAlert) {
						alert("Your session has expired. Reload the page to refresh the session.")
						Wiki.loginAlert = true
					}
				})
			},3*1000) //check login every 3 seconds.
		}
		,name:"default_setupuserupdatetimer"
	}
	,{
		name:"default_setup_exportinit"
		,rule:function() {
			Wiki.exporters.initSidebar()	
		}
	}
	,{
		name:"default_setup_search_listenerinit"
		,rule:function() {
			setInterval(function() {
				var val = document.getElementById("searchInput").value
				if (val != "") {
					Wiki.search.navigationSearch.start(val,{})
				} else {
					Wiki.search.navigationSearch.stop()
				}
			},250)			
		}
	}
	,{
		rule:function() {
			if (node.timestamp) {
				document.getElementById("dateSpan").innerHTML = Wiki.utils.formatTimestamp(node.timestamp)
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
		rule:function() {
			document.getElementById("settingsFilePath").value = node.path
		}
		,name:"default_setup_settingspath"
	}
	,{
		name:"default_setColor_dark"
		,rule:function() {
			Wiki.setup.setPageColorByTheme_dark();				
		}
		,disabled:true
	}
	,{
		name:"default_setColor_light" //Do light setup by default
		,rule:function() {
			Wiki.setup.setPageColorByTheme_light(); //This isn't exactly light, its "sidebar isn't different color than body"			
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
			var title = node.title
			if (!title) {
				if (node.type == "zappwiki") {
					title = ""
				} else {
					title = Wiki.currentPath
				}
			}
			document.title = title
			
			document.getElementById('body').innerHTML = "<h1 class='pagetitle'>"+title+"</h1>"
		}			
	}
	,{
		name:"default_setup_wikipage_header"
		,rule:function() {
			if (node.type == "zappwiki" || node.type=="systemerror") {			
				document.getElementById('body').innerHTML +="<i>"+(node.subtitle ? node.subtitle : "")+"</i>"
			} 
			document.getElementById('body').innerHTML += "<hr>"			
		}
	}
	,{
		name:"default_setup_wikipage_body"
		,rule:function() {
			if (node.type == "zappwiki" || node.type=="systemerror") {			
				document.getElementById('body').innerHTML += Wiki.parse(node.text)
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
					document.getElementById('body').innerHTML += "<pre>"+Wiki.utils.sanitizeCode(node.text)+"</pre>"
				} else {
					document.getElementById('body').innerHTML += (node.type == "html" ? "<a href='/"+Wiki.currentPath+".html'>View HTML</a><BR><BR>" : "")+"<pre style='background-color:inherit'><code class='"+node.type+"' style='overflow:scroll;white-space:unset;height:50vh;'>"+Wiki.utils.sanitizeCode(node.text)+"</code></pre>"
					Wiki.setup.shouldHighlight = true
				}
			}				
		}			
	}
	,{
		name:"default_highlightinit"
		,rule:function() {
			if (Wiki.setup.shouldHighlight) {
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
	Wiki.getRule(Wiki.setup.rules,"default_setColor_dark").disabled = !dark
	Wiki.getRule(Wiki.setup.rules,"default_setColor_light").disabled = !light
}
,setPageColorByTheme_dark:function() {
	if (!Wiki.pageColorSet) {
		//Set the background color of the body to the color of the text. this allows users to use their favorite bootstrap theme while making it still look nice automatically.
		var innerBackgroundColor = window.getComputedStyle( document.body ,null).getPropertyValue('background-color');
		document.getElementById("bodyWrapper").style.backgroundColor = innerBackgroundColor
		var computedColor = window.getComputedStyle( document.body ,null).getPropertyValue('color')
		document.body.style.backgroundColor = computedColor; 
		
		Wiki.setup.setFileFontStyleByTheme();
		
		Wiki.setup.pageColorSet = true;
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
		
		Wiki.setup.setFileFontStyleByTheme();

		
		Wiki.setup.pageColorSet = true;
	}
}
,setFileFontStyleByTheme:function() {
	var color = "#313131"
	var hoverColor = "#171717"
	
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
