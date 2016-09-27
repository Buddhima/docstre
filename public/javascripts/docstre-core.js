var docstreBrowser = angular.module('docstreBrowser', []);

function mainController($scope, $http) {

	var homeLocation = '';

	$http.post('/api/list_folder', {})
		.success(function(data) {
			homeLocation = data[0];
			$scope.entries = refineData(data);
			// console.log(data);
		})
		.error(function(data){
			console.log('Error: ' + data);
		});

	$scope.openFolder = function(folderId) {
		$http.post('/api/list_folder', {"path" : folderId})
			.success(function(data) {
				$scope.entries = refineData(data);
				// console.log(data);
			})
			.error(function(data){
				console.log('Error: ' + data);
			});
	};

	function refineData(data) {
		$scope.previousLocation = $scope.currentLocation;
		$scope.currentLocation = data[0];
		$scope.currentLocation.relPath = extractRelPath(data[0]);

		// Clear previous-location when at home
		if (extractRelPath($scope.currentLocation) == extractRelPath(homeLocation)) {
			$scope.previousLocation = '';
		}

		data.splice(0, 1);
		separateData(data);
		return data;
	};

	function separateData(entries) {
		$scope.folders = [];
		$scope.files = [];

		for (var j = 0; j < entries.length; j++) {			
			if (entries[j]["d:propstat"][0]["d:prop"][0]["d:resourcetype"][0]["d:collection"]) {
				entries[j].relPath = extractRelPath(entries[j]);
				entries[j].title = extractFolderName(entries[j].relPath);				
				$scope.folders.push(entries[j]);
			} else {
				entries[j].relPath = extractRelPath(entries[j]);
				entries[j].title = extractFileName(entries[j].relPath);
				$scope.files.push(entries[j]);
			}
		}
		
	};

	function extractFolderName(fullPath) {
		return (fullPath.replace($scope.currentLocation["d:href"][0], ''));
	}

	function extractFileName(fullPath) {
		return (decodeURIComponent(fullPath.split('/').pop()));
	};

	function extractRelPath(fileObject) {
		return fileObject["d:href"][0];
	}

	$scope.openFile = function(fileId) {
		// window.open(window.location.href + 'editor?fileUri=' + fileId, '_blank').focus();
		window.location.href = window.location.href + 'editor?fileUri=' + fileId;
	};

};


