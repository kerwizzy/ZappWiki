Wiki.ui = {
	addSidebarButtonPanel(obj) { //format {title:<title>,icon:<icon>,buttons:{<list in format {text:<text>,icon:<icon>,action:<action>}>}
		var title = obj.title
		var titleIconStr = ""
		if (obj.icon) {
			titleIconStr = "<span class='fa fa-fw fa-"+obj.icon+"'></span> "
		}
		var panelId = title.replace(/\s/g,"")
		
		var buttons = []
		for (var i = 0; i<obj.buttons.length; i++) {
			var button = obj.buttons[i]
			var iconStr = ""
			if (obj.icon) {
				iconStr = "<span class='fa fa-fw fa-"+button.icon+"'></span> "
			}
			buttons.push(`<button onclick='${button.action}' class='list-group-item'>${iconStr}${button.text}</button>`)
		}		
		var html = 
`
<div class="panel panel-primary">
	<div class="panel-heading" role="tab">
	<h4 class="panel-title">
		<a class="collapsed" role="button" data-toggle="collapse" data-parent="#sidebar" href="#${panelId}">
			${titleIconStr}${title}
		</a>
	</h4>
	</div>
	<div id="${panelId}" class="panel-collapse collapse" role="tabpanel">
		<div class="list-group">
			${buttons.join("\n")}
		</div>
	</div>
</div>`
	
		document.getElementById("sidebar").innerHTML += html
	}


}