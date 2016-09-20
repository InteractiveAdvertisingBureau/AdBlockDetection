#Introduction
Javascript to detect the presence of behavior associated with ad blocking during delivery of a page.

#Operation
The JavaScript (adblockDetector.js) has been tested to detect the behaviors associated with ad blocking in the following web browsers:
- Google Chrome
- Mozilla Firefox
- Internet Explorer (8+)
- Safari

The script does this by creating a set of DIVs that are likely to be hidden by browser-based ad blocking tools.  

Additional tactics that are not yet included in this script:
- URL bait.  Allow the detection of network-based ad blocking.  
- Dynamic bait modification.  Update DIV and URL attributes based on the existing blocking lists (Easylist and so on) to make detection more robust.  

# Installation
Download the desired detection script and add it to your website. There are a few different ways to include JavaScript into HTML.  

| Script Name        | Description    |
| ------------- |:-------------:|
| adblockDetector.js     | Adblocker detection script without Google Analytics module | 
| adblockDetectorWithGA.js     | Adblocker detection script with Google Analytics module | 

With AdBlockDetectionWithGA.js you are asked to mention your GA tracking id into the script on line no 82. When you are referencing this script, it tracks certain events regarding AdBlock on user browser. You can view the details in the Google Analytics dashboard. Here is how to check whether user are using any adblock or not.

- Sign into your Google Analytics account -> Go to your site -> Go to “Reporting” tab -> click “User Explorer” under Audience
- Now from the List of users click any of it -> click on “Expand All” tab. This will show you all data/Event reported from user browser.
 
![alt text](https://s3.amazonaws.com/iab-tech-lab/images/eventfound.png "Event Found")
![alt text](https://s3.amazonaws.com/iab-tech-lab/images/eventnotfound.png "Event Not Found")
 
**How to comprehend the data you see here?**
- There are two type of events -> ‘NotFound’ and ‘Found’. Where NotFound is fired when any ad blocking software is not found and Found is fired like wise.
- Event Category is ‘Detect’ which means it’s a detection event.
- Event action: Its ‘Found’ in case of ad block is present/enabled and ‘NotFound’ likewise.
- Event Label: It contains details of detection test. When it says ‘div visible..’ means the ad are visible to user and ads are not visible(i.e ad block enabled) when we get ‘div hidden..’
- Event count is unique no of event count and event value is number of attempts we made to make sure consistency and reach definitive conclusion.

###### Inline
This is the recommended method of inclusion.  The functions contained in the chosen detection script should be included directly into the HTML of the parent frame.  

Do this by wrapping the content of the selected code in script tags in the delivered HTML.  
###### External Script File
It is possible to host the selected code on your web server as an independent file, and to reference this file from the delivered HTML.  

If you use an external script file, it can be blocked by ad blockers.  Using a different name for the file will reduce the probability that it will be blocked by generic filters. 

###### Other Methods
It is possible to integrate the functions from the selected code into an existing script library, hosted as an external script file.  Doing this may result in reduced site functionality for visitors using ad blockers that are trying to avoid detection, if the ad blockers block the entire external script file.  

# Configuration
@prop flags

| Option        | Type           | Description  |
| ------------- |:-------------:| :-----:|
| debug     | Boolean | Indicates additional debug output should be printed to console |
| found      | String (@function)      |   Function to fire if adblock is detected |
| notfound | String (@function)      |    Function to fire if adblock is not detected.  Note that this will fire each time adblock is not detected, and should provide input to action taken only after “complete” is detected. |
| complete     | String (@function) | Function to fire once testing is complete. |

The test result (boolean) is included as a parameter to callback
example:  
```javascript
window.adblockDetector.init(
        {
          found: function(){ ...},
          notFound: function(){...}
        }
      );
```

# Usage
Add the below code in the HTML page. 
```javascript
<script src="./adblockDetector.js"></script>
	<script>
	// Configure the adblock detector
	(function(){
		var enabledEl = document.getElementById('adb-enabled');
		var disabledEl = document.getElementById('adb-not-enabled');
		function adBlockDetected() {
			enabledEl.style.display = 'block';
			disabledEl.style.display = 'none';
		}
		function adBlockNotDetected() {
			disabledEl.style.display = 'block';
			enabledEl.style.display = 'none';
		}
		
		if(typeof window.adblockDetector === 'undefined') {
			adBlockDetected();
		} else {
			window.adblockDetector.init(
				{
					debug: true,
					found: function(){
						adBlockDetected();
					},
					notFound: function(){
						adBlockNotDetected();
					}
				}
			);
		}
	}());
	</script>
```
 
Add below code in the body of the HTML page
```html
<div class="center">
<h5 class="bg-success" id="adb-not-enabled" style="display: none;">AdBlock is disabled</h5>
<h5 class="bg-danger" id="adb-enabled" style="display: none;">AdBlock is enabled</h5>
</div>
```

# Contributing
Fork it!
Create your feature branch: git checkout -b my-new-feature
Commit your changes: git commit -am 'Add some feature'
Push to the branch: git push origin my-new-feature
Submit a pull request

# FAQ
- The script will not work locally. The page should get served from the server via http
- Currently the “baits” or “honey pods” used in the Javascript are hardcoded @ #218. If you want to update the file with new baits update the line #218
- Use the sample file test.html find in the repository. Host the file on HTTP server eg. apache server and request the file in browser via http with adblocker on/off.
