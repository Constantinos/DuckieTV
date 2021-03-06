DuckieTV.provider('TorrentDialog', function() {
    var activeMagnet = false;
    this.$get = ["$injector", "$rootScope", "$q",
        function($injector, $rootScope, $q) {
            return {
                search: function(query, TVDB_ID, options) {
                    return $injector.get('$dialogs').create('templates/torrentDialog.html', 'torrentDialogCtrl', {
                        query: query,
                        TVDB_ID: TVDB_ID
                    }, options || {
                        size: 'lg'
                    });
                },
                /**
                 * launch magnet via a hidden iframe and broadcast the fact that it's selected to anyone listening
                 */
                launchMagnet: function(magnet, TVDB_ID) {
                    console.log("Firing magnet URI! ", magnet, TVDB_ID);
                    $rootScope.$broadcast('magnet:select:' + TVDB_ID, magnet.match(/([0-9ABCDEFabcdef]{40})/)[0].toUpperCase());
                    var uTorrent = $injector.get('uTorrent');
                    if (uTorrent.isConnected()) { // fast method when using utorrent api.
                        uTorrent.getRemote().add.torrent(magnet);
                        setTimeout(function() {
                            uTorrent.Update(true); // force an update from utorrent after 1.5 second to show the user that the torrent has been added.
                        }, 1500);
                    } else {
                        var d = document.createElement('iframe');
                        d.id = 'torrentmagnet_' + new Date().getTime();
                        d.src = magnet;
                        d.style.visibility = 'hidden';
                        document.body.appendChild(d);
                        setTimeout(function() {
                            document.body.removeChild(d);
                        }, 3000);
                    }
                }
            };
        }
    ];
})

.controller('torrentDialogCtrl', ["$scope", "$rootScope", "$modalInstance", "$injector", "data", "TorrentDialog", "GenericSearch", "SettingsService",
    function($scope, $rootScope, $modalInstance, $injector, data, TorrentDialog, GenericSearch, SettingsService) {
        //-- Variables --//
        var customClients = {};

        $scope.items = [];
        $scope.searching = true;
        $scope.query = angular.copy(data.query);
        $scope.TVDB_ID = angular.copy(data.TVDB_ID);
        $scope.searchprovider = $scope.getSetting('torrenting.searchprovider');
        $scope.searchquality = $scope.getSetting('torrenting.searchquality');

        $scope.getName = function(provider) {
            return provider;
        };

        $scope.search = function(q, TVDB_ID) {
            $scope.searching = true;
            $scope.query = q;
            if (TVDB_ID !== undefined) {
                $scope.TVDB_ID = TVDB_ID;
            }

            var searchProvider = (!($scope.searchprovider in customClients)) ? GenericSearch : $injector.get(customClients[$scope.searchprovider]);

            searchProvider.search([q, $scope.searchquality].join(' ')).then(function(results) {
                    $scope.items = results;
                    $scope.searching = false;
                },
                function(e) {
                    $scope.searching = false;
                });
        };

        // Changes the search quality while searching for a torrent
        $scope.setQuality = function(quality) {
            $scope.searchquality = quality;
            $scope.search($scope.query);
        };

        // Changes what search provider you search with
        $scope.setProvider = function(provider) {
            $scope.searchprovider = provider;
            if (!(provider in customClients)) {
                GenericSearch.setProvider(provider);
            }
            $scope.search($scope.query);
        }

        $scope.cancel = function() {
            $modalInstance.dismiss('Canceled');
        };

        // Selects and launchs magnet
        $scope.magnetSelect = function(magnet) {
            console.info("Magnet selected!", magnet);
            $modalInstance.close(magnet);

            var channel = $scope.TVDB_ID !== null ? $scope.TVDB_ID : $scope.query;
            TorrentDialog.launchMagnet(magnet, channel);
        };

        $scope.getClients = function() {
            var clients = window.TorrentSearchProviders;
            clients['ShowRSS.info'] = true;
            customClients['ShowRSS.info'] = 'ShowRSS';
            for (var name in clients) {
                if (SettingsService.get(name + '.mirror')) {
                    clients[name].mirror = SettingsService.get(name + '.mirror');
                }
            }
            $scope.clients = clients;
        };

        $scope.getClients();

        $scope.search($scope.query);
    }
])

.directive('torrentDialog', ["TorrentDialog", "$filter",
    function(TorrentDialog, $filter) {
        return {
            restrict: 'E',
            transclude: true,
            wrap: true,
            replace: true,
            scope: {
                q: '=q',
                TVDB_ID: '=tvdbid'
            },
            template: '<a class="torrent-dialog" ng-click="openDialog()" tooltip="{{getTooltip()}}"><i class="glyphicon glyphicon-download"></i><span ng-transclude></span></a>',
            controller: ["$scope",
                function($scope) {
                    // Translates the tooltip
                    $scope.getTooltip = function() {
                        return $scope.q !== undefined ?
                            $filter('translate')('TORRENTDIALOG/search-download-this/tooltip') + $scope.q :
                            $filter('translate')('TORRENTDIALOG/search-download-any/tooltip');
                    }
                    // Opens the torrent search with the episode selected
                    $scope.openDialog = function() {
                        TorrentDialog.search($scope.q, $scope.TVDB_ID);
                    }
                }
            ]
        }
    }
])