# Introduction
Javascript to detect the presence of behavior associated with ad blocking during delivery of a page.

# Operation
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
| adblockDetectorWithGTM.js     | Adblocker detection script with Google Tag Manager module |

###### Setting up Google Analytics
With `adblockDetectorWithGA.js` you are asked to mention your GA tracking id into the script on line no 82. When you are referencing this script, it tracks certain events regarding AdBlock on user browser. You can view the details in the Google Analytics dashboard. Here is how to check whether user are using any adblock or not.

Firstly, we would suggest you create a different GA-Tracking id so that it might not interfere with your pageviews. Follow below steps for GA on Use of Adblock. 
 
- Sign into your Google Analytics account -> Go to your site -> Go to “Reporting” tab -> click “User Explorer” under Audience.
- Click on “Add new segment” -> “New Segment” -> Give Segment name (ex: ‘Adblock Detected’) -> Click on “conditions” under Advanced section.
- Click on Sessions and select Users (You can create a different one for sessions too.) 
- Click on the first Drop Down -> Click on “Behavior” ->Select “Event Label”.
- Click On the Text box: Type event label as below.
- Event Label- “div hidden” – this will give you all users with Ad block enable/found.Now your one segment with Users who use ad block is ready. 
- Repeat all above steps with Below event label for users who do not use ad block. 
- Event Label- “div visible” –this will give you all users with ad block disabled/notfound.

Unfortunately we have not figured out yet how to put it to dash board. So next time when you go to GA, you can go to User Explorer -> click Add new segment. And you will find the segments you previously created(i.e one for adblock Detected users and one for ad block NotDetected users.). You can select them and click on apply to see reported data.

It should look like below image.

![alt text](https://s3.amazonaws.com/iab-tech-lab/images/ga.png "GA User Explorer")

###### Setting up Google Tag Manager
With `adblockDetectorWithGTM.js` you are asked to define the name of your data 
layer. In most cases you should be able to use the default `dataLayer` value 
used in standard Google Tag Manager implementations. The script will then push 
an event to the data layer every time the adblock detection process has been 
completed.

The format of the push to the data layer looks something like:

```javascript
dataLayer.push({
	'event': 'adblockDetection',
	'adblockValues': {
		'found': 'Found',
		'triggerFound': 'div hidden with attribute: null attr-offsetParent',
		'attemptNum': 5
	}
})
```

To take advantage of this within Google Tag Manager, you should:
- Create a trigger that fires when the Event variable equals `adblockDetection`
- Create a data layer variable to hold the `adblockValues` values. You can 
access the subcomponents using dot notation. For example, if you name the 
variable `adblockValues`, you can use the following calls in your tags:
  - `{{adblockValues}}.found`
  - `{{adblockValues}}.triggerFound`
  - `{{adblockValues}}.attemptNum`
- Create a tag to do something (e.g. send to Google Analytics, send to an API 
endpoint, etc.) with the information


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
