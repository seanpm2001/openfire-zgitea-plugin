(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["converse"], factory);
    } else {
        factory(converse);
    }
}(this, function (converse) {

    var Strophe, $iq, $msg, $pres, $build, b64_sha1, _ , dayjs, _converse, html, _, __, Model, BootstrapModal, galene_confirm, galene_invitation, galene_tab_invitation;

    converse.plugins.add("galene", {
        dependencies: [],

        initialize: function () {
            _converse = this._converse;

            Strophe = converse.env.Strophe;
            $iq = converse.env.$iq;
            $msg = converse.env.$msg;
            $pres = converse.env.$pres;
            $build = converse.env.$build;
            b64_sha1 = converse.env.b64_sha1;
            dayjs = converse.env.dayjs;
            html = converse.env.html;
            Model = converse.env.Model;
            BootstrapModal = converse.env.BootstrapModal;
            _ = converse.env._;
            __ = _converse.__;
			
			const domain = location.hostname;
			const server = location.host;
			const url = (domain == "localhost" || location.protocol == "http:" ? "http://" : "https://") + server + "/galene";			

            _converse.api.settings.update({
                galene_head_display_toggle: false,
                galene_url: url,
				galene_host: location.hostname
            });

            galene_confirm  = __('Galene Meeting?');
            galene_invitation = __('Please join meeting in room at');
            galene_tab_invitation = __('Or open in new tab at');

            _converse.api.listen.on('messageNotification', function (data)
            {
                console.debug("messageNotification", data);

                var chatbox = data.chatbox;
                var bodyElement = data.stanza.querySelector('body');

                if (bodyElement)
                {
                    var body = bodyElement.innerHTML;
                    var url = _converse.api.settings.get("galene_url");
                    var pos = body.indexOf(url + "/");

                    if (pos > -1)
                    {
                        var group = urlParam ("group", body);
                        var host = urlParam ("host", body);						
                        var label = galene_invitation;
                        var from = chatbox.getDisplayName().trim();
                        var avatar = _converse.api.settings.get("notification_icon");

                        if (data.chatbox.vcard.attributes.image) avatar = data.chatbox.vcard.attributes.image;

                        var prompt = new Notification(from,
                        {
                            'body': label + " " + group,
                            'lang': _converse.locale,
                            'icon': avatar,
                            'requireInteraction': true
                        });

                        prompt.onclick = function(event)
                        {
                            event.preventDefault();

                            var box_jid = Strophe.getBareJidFromJid(chatbox.get("contact_jid") || chatbox.get("jid") || chatbox.get("from"));
                            var view = _converse.chatboxviews.get(box_jid);

                            if (view)
                            {
                                doLocalVideo(view, group, label, host);
                            }
                        }
                    }
                }
            });

            _converse.api.listen.on('getToolbarButtons', async function(toolbar_el, buttons)
            {
                console.debug("getToolbarButtons", toolbar_el.model.get("jid"));
                let color = "fill:var(--chat-toolbar-btn-color);";
                if (toolbar_el.model.get("type") === "chatroom") color = "fill:var(--muc-toolbar-btn-color);";
				
				buttons.push(html`
					<button class="plugin-galene" title="${__('Galene Meeting')}" @click=${performVideo}/>
						<svg style="width:20px; height:20px; ${color}" viewBox="0 0 452.388 452.388"  xml:space="preserve"> <g> 	<g id="Layer_8_38_"> 		<path d="M441.677,43.643H10.687C4.785,43.643,0,48.427,0,54.329v297.425c0,5.898,4.785,10.676,10.687,10.676h162.069v25.631 			c0,0.38,0.074,0.722,0.112,1.089h-23.257c-5.407,0-9.796,4.389-9.796,9.795c0,5.408,4.389,9.801,9.796,9.801h158.506 			c5.406,0,9.795-4.389,9.795-9.801c0-5.406-4.389-9.795-9.795-9.795h-23.256c0.032-0.355,0.115-0.709,0.115-1.089V362.43H441.7 			c5.898,0,10.688-4.782,10.688-10.676V54.329C452.37,48.427,447.589,43.643,441.677,43.643z M422.089,305.133 			c0,5.903-4.784,10.687-10.683,10.687H40.96c-5.898,0-10.684-4.783-10.684-10.687V79.615c0-5.898,4.786-10.684,10.684-10.684 			h370.446c5.898,0,10.683,4.785,10.683,10.684V305.133z M303.942,290.648H154.025c0-29.872,17.472-55.661,42.753-67.706 			c-15.987-10.501-26.546-28.571-26.546-49.13c0-32.449,26.306-58.755,58.755-58.755c32.448,0,58.753,26.307,58.753,58.755 			c0,20.553-10.562,38.629-26.545,49.13C286.475,234.987,303.942,260.781,303.942,290.648z"/> </g></g> </svg>
					</button>
				`);						
			
                return buttons;
            });

            _converse.api.listen.on('connected', function()
            {
                window.connection = _converse.connection;
            });			

            _converse.api.listen.on('afterMessageBodyTransformed', function(model, text)
            {					
                if (text.indexOf("/galene/") > -1) {
                    const url = text.substring(0);
					const group = urlParam ("group", url);
                    const host = urlParam ("host", url);						
					
					if (group && host) {
						const link_label = galene_invitation;
						const tab_label = galene_tab_invitation;
						
						let jid = Strophe.getBareJidFromJid(model.get("jid"));

						if (model.get("sender") == "them") {
							jid = Strophe.getBareJidFromJid(model.get("from"));
						}
						
						if (model.get("type") == "groupchat") {
							jid = model.get("from_muc");
						}						

						text.references = [];
						text.addTemplateResult(0, text.length, html`<a @click=${clickVideo} data-host="${host}" data-jid="${jid}" data-group="${group}" data-url="${url}" href="${url}">${link_label} ${group}</a>`);
					}
                }			
            });

            console.debug("galene plugin is ready");
        }
    });
	
	function urlParam (name, url) {
		const results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(url);
		if (!results) { return undefined; }
		return unescape(results[1] || undefined);
	}	

    function __confirm(msg, callback) {
      if (confirm(galene_confirm)) {
          callback();
      }
    }

    function __displayError(error) {
      alert(error);
    }

    function getChatViewFromElement($el) {
        return $el.closest('converse-chat.chatbox') || $el.closest('converse-muc.chatbox');
    }

    function performVideo(ev)
    {
        ev.stopPropagation();
        ev.preventDefault();

		const toolbar_el = converse.env.utils.ancestor(ev.target, 'converse-chat-toolbar');
		const chatView = _converse.chatboxviews.get(toolbar_el.model.get('jid'));	
		
		if (chatView) {
			__confirm(galene_confirm, function() {
				doVideo(chatView);
			});
		}
    }

    function clickVideo(ev)
    {
        ev.stopPropagation();
        ev.preventDefault();

        const group = ev.target.getAttribute("data-group");
        const host = ev.target.getAttribute("data-host");	
        const jid = ev.target.getAttribute("data-jid");	
		const chatView = _converse.chatboxviews.get(jid);			

        console.debug("clickVideo", ev.target, group, host, chatView);
		
        if (chatView) {			
          doLocalVideo(chatView, group, galene_invitation, host);
        }
    }

    var doVideo = function doVideo(view)
    {
		const host = _converse.api.settings.get("galene_host");
        const group = Strophe.getNodeFromJid(view.model.attributes.jid).toLowerCase().replace(/[\\]/g, '') + "-" + Math.random().toString(36).substr(2,9);
        const url = _converse.api.settings.get("galene_url") + '/?group=' + group + "&host=" + host;

        console.debug("doVideo", group, url, view);

        view.model.sendMessage(url);	
        doLocalVideo(view, group, galene_invitation, host);
    }

    var doLocalVideo = function doLocalVideo(view, group, label, host)
    {
        const chatModel = view.model;
        console.debug("doLocalVideo", view, group, label, host);
		
		if (!host) host = _converse.api.settings.get("galene_host");

		const isOverlayedDisplay = _converse.api.settings.get("view_mode") === "overlayed";
		const headDisplayToggle = isOverlayedDisplay || _converse.api.settings.get("galene_head_display_toggle") === true;
		const div = view.el.querySelector(headDisplayToggle ? ".chat-body" : ".box-flyout");

		if (div) {
			let firstTime = true;

			let openChatbox = function ()
			{
				let jid = view.model.get("jid");
				let type = view.model.get("type");

				console.debug("openChatbox", jid, type);

				if (jid)
				{
					if (type == "chatbox") _converse.api.chats.open(jid, {'bring_to_foreground': true}, true);
					else
					if (type == "chatroom") _converse.api.rooms.open(jid, {'bring_to_foreground': true}, true);
				}
			}	
			
			let closeGalene = function(currentModel) {
			  console.debug("doLocalVideo - closeGalene", this);
			  
			  if (currentModel && currentModel.cid !== chatModel.cid) {
				return;
			  }
			  galeneFrame.remove();
			  view.close();
			  setTimeout(function() { openChatbox() });				  
			}
			
			let galeneIframeCloseHandler = function () {
				console.debug("doLocalVideo - galeneIframeCloseHandler");
				
				if (!firstTime) {
					closeGalene();
				}
				
				if (firstTime) {
					firstTime = false;   // ignore when galene-meet room url is loaded
					
					galeneFrame.contentWindow.addEventListener("message", function (event) {
					  if (typeof event.data === 'string') {
						let data = JSON.parse(event.data);
						let galeneEvent = data['galene_event'];
						if ('close' === galeneEvent) {
						  closeGalene();
						}
					  }
					}, false);						
				}
			};
			
			const jid = view.model.attributes.jid;			
			let galeneFrame = document.createElement('iframe');

			galeneFrame.__jid = jid;
			galeneFrame.addEventListener("load", galeneIframeCloseHandler);
			galeneFrame.setAttribute("src", "/assets/packages/galene/index.html?username=" + Strophe.getNodeFromJid(_converse.connection.jid) + "&password=&group=" + group + "&host=" + host);
			galeneFrame.setAttribute("class", "galene");
			galeneFrame.setAttribute("allow", "microphone; camera;");
			galeneFrame.setAttribute("frameborder", "0");
			galeneFrame.setAttribute("seamless", "seamless");
			galeneFrame.setAttribute("allowfullscreen", "true");
			galeneFrame.setAttribute("scrolling", "no");
			galeneFrame.setAttribute("style", "width:100%; height:100%; border:none; margin:0; padding:0; overflow:hidden;");

			div.innerHTML = "";			
			div.appendChild(galeneFrame);					
										
		}
    }		
}));
