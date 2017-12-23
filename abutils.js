// ===============================================
// AdBlock detector
//
// Attempts to detect the presence of Ad Blocker software and notify listener of its existence.
// Copyright (c) 2017 IAB
//
// The BSD-3 License
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
// ===============================================

/**
* @name window.adblockDetector
*
* IAB Adblock detector.
* Usage: window.adblockDetector.init(options);
*
* Options object settings
*
*	@prop debug:  boolean
*         Flag to indicate additional debug output should be printed to console
*
*	@prop found: @function
*         Callback function to fire if adblock is detected
*
*	@prop notfound: @function
*         Callback function to fire if adblock is not detected.
*         NOTE: this function may fire multiple times and give false negative
*         responses during a test until adblock is successfully detected.
*
*	@prop complete: @function
*         Callback function to fire once a round of testing is complete.
*         The test result (boolean) is included as a parameter to callback
*
* example: 	window.adblockDetector.init(
				{
					found: function(){ ...},
 					notFound: function(){...}
				}
			);
*
*
*/

"use strict";
(function(win) {
	
	var version = '1.0';
	
	var ofs = 'offset', cl = 'client';
	var noop = function(){};
	
	var testedOnce = false;
	var testExecuting = false;
	
	var isOldIEevents = (win.addEventListener === undefined);
	
	/**
	* Options set with default options initialized
	*
	*/	
	var _options = {
		loopDelay: 50,
		maxLoop: 5,
		debug: true,
		found: noop, 					// function to fire when adblock detected
		notfound: noop, 				// function to fire if adblock not detected after testing
		complete: noop  				// function to fire after testing completes, passing result as parameter
	}
	
	function parseAsJson(data){
		var result, fnData;
		try{
			result = JSON.parse(data);
		}
		catch(ex){
			try{
				fnData = new Function("return " + data);
				result = fnData();
			}
			catch(ex){
				log('Failed secondary JSON parse', true);
			}			
		}
		
		return result;
	}
	
	/**
	* Ajax helper object to download external scripts.
	* Initialize object with an options object
	* Ex:
	  {
		  url : 'http://example.org/url_to_download',
		  method: 'POST|GET',
		  success: callback_function,
		  fail:  callback_function
	  }		
	*/
	var AjaxHelper = function(opts){
		var xhr = new XMLHttpRequest();
		
		this.success = opts.success || noop;
		this.fail = opts.fail || noop;
		var me = this;
		
		var method = opts.method || 'get';
		
		/**
		* Abort the request
		*/
		this.abort = function(){
			try{
				xhr.abort();
			}
			catch(ex){
			}
		}
		
		function stateChange(vals){
			if(xhr.readyState == 4){
				if(xhr.status == 200){
					me.success(xhr.response);
				}
				else{
					// failed
					me.fail(xhr.status);
				}				
			}
		}
		
		xhr.onreadystatechange = stateChange;
		
		function start(){
			xhr.open(method, opts.url, true);
			xhr.send();
		}
		
		start();
	}
	
	/**
	* Object tracking the various block lists
	*/
	var BlockListTracker = function(){
		var me = this;
		var externalBlocklistData = {};
		
		/**
		* Add a new external URL to track
		*/
		this.addUrl = function(url){
			externalBlocklistData[url] = {
				url: url,
				state: 'pending',
				format: null,
				data: null,
				result: null
			}
			
			return externalBlocklistData[url];
		}
		
		/**
		* Loads a block list definition
		*/
		this.setResult = function(urlKey, state, data){
			var obj = externalBlocklistData[urlKey];
			if(obj == null){
				obj = this.addUrl(urlKey);
			}
			
			obj.state = state;
			if(data == null){
				obj.result = null;
				return;
			}
			
			if(typeof data === 'string'){
				try{
					data = parseAsJson(data);
					obj.format = 'json';
				}
				catch(ex){
					obj.format = 'easylist';
					// parseEasyList(data);
				}
			}
			obj.data = data;
			
			return obj;
		}
		
	}
	
	var listeners = []; // event response listeners
	var baitNode = null;
	var quickBait = {
		cssClass: 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links'		
	};
	var baitTriggers = {
		nullProps: [ofs + 'Parent'],
		zeroProps: []
	};
	
	baitTriggers.zeroProps = [
		ofs +'Height', ofs +'Left', ofs +'Top', ofs +'Width', ofs +'Height',
		cl + 'Height', cl + 'Width'
	];
	
	// result object
	var exeResult = {
		quick: null,
		remote: null
	};
	
	var findResult = null; // result of test for ad blocker
	
	var timerIds = {
		test: 0,
		download: 0
	};
	
	function isFunc(fn){
		return typeof(fn) == 'function';
	}
	
	/**
	* Make a DOM element
	*/
	function makeEl(tag, attributes){
		var k, v, el, attr = attributes;
		var d = document;
		
		el = d.createElement(tag);
		
		if(attr){
			for(k in attr){
				if(attr.hasOwnProperty(k)){
					el.setAttribute(k, attr[k]);
				}
			}
		}
		
		return el;
	}
	
	function attachEventListener(dom, eventName, handler){
		if(isOldIEevents){
			dom.attachEvent('on' + eventName, handler);
		}
		else{
			dom.addEventListener(eventName, handler, false);
		}
	}
	
	function log(message, isError){
		if(!_options.debug && !isError){
			return;
		}
		if(win.console && win.console.log){
			if(isError){
				console.error('[ABD] ' + message);
			}
			else{
				console.log('[ABD] ' + message);
			}
		}
	}
	
	var ajaxDownloads = [];
	
	/**
	* Load and execute the URL inside a closure function
	*/
	function loadExecuteUrl(url){
		var ajax, result;
		
		blockLists.addUrl(url);
		// setup call for remote list
		ajax = new AjaxHelper(
			{ 
				url: url,
				success: function(data){
					log('downloaded file ' + url); // todo - parse and store until use
					result = blockLists.setResult(url, 'success', data);
					try{
						var intervalId = 0,
							retryCount = 0;
						
						var tryExecuteTest = function(listData){
							if(!testExecuting){
								beginTest(listData, true);
								return true;
							}
							return false;			
						}
						
						if(findResult == true){
							return;
						}
						
						if(tryExecuteTest(result.data)){
							return;
						}
						else{							
							log('Pause before test execution');
							intervalId = setInterval(function(){
								if(tryExecuteTest(result.data) || retryCount++ > 5){
									clearInterval(intervalId);
								}
							}, 250);
						}
					}
					catch(ex){
						log(ex.message + ' url: ' + url, true);
					}
				},
				fail: function(status){
					log(status, true);
					blockLists.setResult(url, 'error', null);
				}
			});
			
		ajaxDownloads.push(ajax);
	}
	
	
	/**
	* Fetch the external lists and initiate the tests
	*/
	function fetchRemoteLists(){
		var i, url;
		var opts = _options;
		
		for(i=0;i<opts.blockLists.length;i++){
			url = opts.blockLists[i];
			loadExecuteUrl(url);			
		}
	}
	
	function cancelRemoteDownloads(){
		var i, aj;
		
		for(i=ajaxDownloads.length-1;i >= 0;i--){
			aj = ajaxDownloads.pop();
			aj.abort();
		}		
	}
	
	
	// =============================================================================
	/**
	* Begin execution of the test
	*/
	function beginTest(bait){
		log('start beginTest');
		if(findResult == true){
			return; // we found it. don't continue executing
		}
		testExecuting = true;
		castBait(bait);
		
		exeResult.quick = 'testing';
		
		timerIds.test = setTimeout(
			function(){ reelIn(bait, 1); },
			5);
	}
	
	/**
	* Create the bait node to see how the browser page reacts
	*/
	function castBait(bait){
		var i, d = document, b = d.body;
		var t;
		var baitStyle = 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;'
		
		if(bait == null || typeof(bait) == 'string'){
			log('invalid bait being cast');
			return;
		}
		
		if(bait.style != null){
			baitStyle += bait.style;
		}
		
		baitNode = makeEl('div', {
			'class': bait.cssClass,
			'style': baitStyle
		});
		
		log('adding bait node to DOM');

		b.appendChild(baitNode);
		
		// touch these properties
		for(i=0;i<baitTriggers.nullProps.length;i++){
			t = baitNode[baitTriggers.nullProps[i]];
		}
		for(i=0;i<baitTriggers.zeroProps.length;i++){
			t = baitNode[baitTriggers.zeroProps[i]];
		}
	}
	
	/**
	* Run tests to see if browser has taken the bait and blocked the bait element
	*/
	function reelIn(bait, attemptNum){
		var i, k, v;
		var body = document.body;
		var found = false;
		
		if(baitNode == null){
			log('recast bait');
			castBait(bait || quickBait);
		}

		if(typeof(bait) == 'string'){
			log('invalid bait used', true);
			if(clearBaitNode()){
				setTimeout(function(){
					testExecuting = false;
				}, 5);
			}

			return;
		}

		if(timerIds.test > 0){
			clearTimeout(timerIds.test);
			timerIds.test = 0;
		}
		
		// test for issues

		if(body.getAttribute('abp') !== null){
			log('found adblock body attribute');
			found = true;
		}

		for(i=0;i<baitTriggers.nullProps.length;i++){
			if(baitNode[baitTriggers.nullProps[i]] == null){
				if(attemptNum>4)
				found = true;
				log('found adblock null attr: ' + baitTriggers.nullProps[i]);
				break;
			}
			if(found == true){
				break;
			}
		}
		
		for(i=0;i<baitTriggers.zeroProps.length;i++){
			if(found == true){
				break;
			}
			if(baitNode[baitTriggers.zeroProps[i]] == 0){
				if(attemptNum>4)
				found = true;
				log('found adblock zero attr: ' + baitTriggers.zeroProps[i]);
			}
		}

		if(window.getComputedStyle !== undefined) {
			var baitTemp = window.getComputedStyle(baitNode, null);
			if(baitTemp.getPropertyValue('display') == 'none'
			|| baitTemp.getPropertyValue('visibility') == 'hidden') {
				if(attemptNum>4)
				found = true;
				log('found adblock computedStyle indicator');
			}
		}

		testedOnce = true;
		
		if(found || attemptNum++ >= _options.maxLoop){
			findResult = found;
			log('exiting test loop - value: ' + findResult);
			notifyListeners();
			if(clearBaitNode()){
				setTimeout(function(){
					testExecuting = false;
				}, 5);
			}
		}
		else{
			timerIds.test = setTimeout(function(){
				reelIn(bait, attemptNum);
			}, _options.loopDelay);
		}
	}
	
	function clearBaitNode(){
		if(baitNode === null){
			return true;
		}
		
		try{
			if(isFunc(baitNode.remove)){
				baitNode.remove();
			}
			document.body.removeChild(baitNode);
		}
		catch(ex){
		}
		baitNode = null;
		
		return true;		
	}
	
	/**
	* Halt the test and any pending timeouts
	*/
	function stopFishing(){
		if(timerIds.test > 0){
			clearTimeout(timerIds.test);
		}
		if(timerIds.download > 0){
			clearTimeout(timerIds.download);
		}
		
		cancelRemoteDownloads();
		
		clearBaitNode();
	}
	
	/**
	* Fire all registered listeners
	*/
	function notifyListeners(){
		var i, funcs;
		if(findResult === null){
			return;
		}
		for(i=0;i<listeners.length;i++){
			funcs = listeners[i];
			try{			
				if(funcs != null){
					if(isFunc(funcs['complete'])){
						funcs['complete'](findResult);
					}
					
					if(findResult && isFunc(funcs['found'])){
						funcs['found']();
					}
					else if(findResult === false && isFunc(funcs['notfound'])){
						funcs['notfound']();
					}
				}
			}
			catch(ex){
				log('Failure in notify listeners ' + ex.Message, true);
			}
		}
	}
	
	/**
	* Attaches event listener or fires if events have already passed.
	*/
	function attachOrFire(){
		var fireNow = false;
		var fn;
		
		if(document.readyState){
			if(document.readyState == 'complete'){
				fireNow = true;
			}
		}
		
		fn = function(){
			beginTest(quickBait, false);
		}
		
		if(fireNow){
			fn();
		}
		else{
			attachEventListener(win, 'load', fn);
		}
	}
	
	
	var blockLists; // tracks external block lists
	
	/**
	* Public interface of adblock detector
	*/
	var impl = {
		/**
		* Version of the adblock detector package
		*/
		version: version,
		
		/**
		* Initialization function. See comments at top for options object
		*/
		init: function(options){
			var k, v, funcs;
			
			if(!options){
				return;
			}
			
			funcs = {
				complete: noop,
				found: noop,
				notfound: noop
			};
			
			for(k in options){
				if(options.hasOwnProperty(k)){
					if(k == 'complete' || k == 'found' || k == 'notFound'){
						funcs[k.toLowerCase()] = options[k];
					}
					else{
						_options[k] = options[k];
					}					
				}
			}
			
			listeners.push(funcs);
			
			blockLists = new BlockListTracker();
			
			attachOrFire();
		}
	}
	
	win['adblockDetector'] = impl;

})(window)	
