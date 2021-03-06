/**
 * The CalendarEvents service provides storage and retrieve functions
 * for episodes that are displayed on the calendar. It has built-in cache
 * and watches for the calendar changing it's date before fetching a new
 * set of episodes from the database
 */
DuckieTV.factory('CalendarEvents', ["$rootScope", "FavoritesService",
    function($rootScope, FavoritesService) {

        var calendarEvents = {};
        var activeDate = null;

        var service = {
            /**
             * setDate gets fired by the vendor/datePicker directive whenever the user navigates the calendar with the arrows back and forth
             * It is hooked here so that the range can be determined (either one week or one whole month) and fetches episodes for that range
             * from the database. When those are fetched, the calendar refreshes itself.
             * @param Date date startDate of the calendar
             * @param string range (week|date) range to fetch. A week or a month (date is a naming inconsistency caused by the directive)
             */
            setDate: function(date, range) {
                range = range || $rootScope.getSetting('calendar.mode');
                var endDate = new Date(date);
                var startDate = new Date(date);
                switch (range) {
                    case 'week':
                        endDate.setDate(startDate.getDate() + 7);
                        startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
                        break;
                    case 'date': // actually: a month.
                        endDate.setDate(40);
                        startDate.setDate(-47);
                        break;
                }
                if (startDate.toDateString() != activeDate) {
                    activeDate = startDate.toDateString();
                    service.getEventsForDateRange(startDate, endDate);
                }
            },
            /**
             * Optimized function to feed the calendar it's data.
             * Fetches the episodes for a date range and the relevant series for it. Then caches and refreshes the calendar
             * @param  Date start startDate
             * @param  Date end endDate
             */
            getEventsForDateRange: function(start, end) {
                // fetch episodes between 2 timestamps
                FavoritesService.getEpisodesForDateRange(start.getTime(), end.getTime()).then(function(episodes) {
                    // iterate all the episodes and bind it together with the serie into an event array
                    service.setEvents(episodes.map(function(episode) {
                        return {
                            start: new Date(episode.firstaired),
                            serie: FavoritesService.getByID_Serie(episode.ID_Serie),
                            episode: episode
                        };
                    }));
                });
            },
            clearCache: function() {
                activeDate = null;
                calendarEvents = {};
            },
            /** 
             * Merge any incoming new events with the events already in calendarEvents.
             * Removes any mention of the episode that already exists and then adds the new one.
             * The calendarEvents cache is updated per day so the calendar doesn't refresh unnecessarily
             */
            setEvents: function(events) {
                events.map(function(event) {
                    var date = new Date(new Date(event.start).getTime()).toDateString();

                    if (!(date in calendarEvents)) {
                        calendarEvents[date] = [];
                    }
                    service.deleteDuplicate(event.episode.getID(), date);
                    var existing = calendarEvents[date].filter(function(el) {
                        return el.episode.getID() == event.episode.getID();
                    });
                    if (existing.length === 0) {
                        calendarEvents[date].push(event);
                    } else {
                        var index = calendarEvents[date].indexOf(existing[0]);
                        calendarEvents[date][index].episode = event.episode;
                    }
                    calendarEvents[date] = calendarEvents[date].sort(function(a, b) {
                        var ad = new Date(a.episode.firstaired_iso).getTime();
                        var bd = new Date(b.episode.firstaired_iso).getTime()
                        if (ad < bd) return -1;
                        else if (ad > bd) return 1;
                        else {
                            // air at the same time, now order by title first and if the names match by episode
                            if (a.ID_Serie == b.ID_Serie) {
                                if (a.episode.episodenumber < b.episode.episodenumber) return -1;
                                if (a.episode.episodenumber > b.episode.episodenumber) return 1;

                            } else {
                                return a.serie.title > b.serie.title;
                            }

                        }

                    });
                });
                existing = index = null;
                $rootScope.$broadcast('calendar:events', events);
            },
            /** 
             * If the episode exist in the calendarEvents object, remove it.
             */
            deleteDuplicate: function(duplicateID, eventDate) {
                for (var aDate in calendarEvents) {
                    if (aDate !== eventDate) {
                        var eventList = calendarEvents[aDate];
                        for (var index = 0; index < eventList.length; index++) {
                            if (eventList[index].episodeID === duplicateID) {
                                calendarEvents[aDate].splice(index, 1);
                                return;
                            }
                        }
                    }
                }
                eventList = index = aDate = null; // clear used variables, every little bit counts :-) 
            },
            /**
             * Check if an event exists at the given date
             */
            hasEvent: function(date) {
                return (new Date(date).toDateString() in calendarEvents);
            },
            /**
             * Return events for a date or an empty array
             */
            getEvents: function(date) {
                var str = date instanceof Date ? date.toDateString() : new Date(date).toDateString();
                return (str in calendarEvents) ? calendarEvents[str] : [];
            }
        };

        $rootScope.$on('episode:marked:watched', function(event, data) {
            service.setEvents([{
                start: new Date(data.firstaired),
                episodeID: data.TVDB_ID,
                episode: data
            }]);
        });

        $rootScope.$on('episode:marked:notwatched', function(event, data) {
            service.setEvents([{
                start: new Date(data.firstaired),
                episodeID: data.TVDB_ID,
                episode: data
            }]);
        });

        /**
         * Refresh the active calendar by re-fetching all data.
         */
        $rootScope.$on('favorites:updated', function(event, favorites) {
            service.clearCache();
            service.setDate(new Date());
        });

        /**
         * Reset the calendarEvents object so that any cache is flushed
         */
        $rootScope.$on('calendar:clearcache', function() {
            service.clearCache();
        });

        /**
         * When the calendar broadcasts a setDate event, fetch new data for that range.
         */
        $rootScope.$on('setDate', function(evt, date, range) {
            if (FavoritesService.favorites.length > 0) {
                service.setDate(date, range);
            }
        });
        return service;
    }
])

/**
 * The <calendar-event> directive displays an episode on the calendar
 * This also watches for the magnet:select event will be fired by the
 * TorrentDialog when a user selects a magnet link for an episode.
 */
.directive('calendarEvent', ["uTorrent", "SceneNameResolver", "EpisodeAiredService", "SettingsService",
    function(uTorrent, SceneNameResolver, EpisodeAiredService, SettingsService, $location) {
        return {
            restrict: 'E',
            scope: {
                serie: '=',
                episode: '='
            },
            templateUrl: 'templates/event.html',
            controller: function($scope, $rootScope, $location) {

                $scope.getSetting = SettingsService.get;
                $scope.hoverTimer = null;
                var cachedSearchString = false;

                /**
                 * Auto-switch background image to a relevant one for the calendar item when
                 * hovering over an item for 1.5s
                 * @return {[type]} [description]
                 */
                $scope.startHoverTimer = function() {
                    $scope.clearHoverTimer();
                    // Make sure serie has fanart defined
                    if ($scope.serie.fanart) {
                        var background = $scope.serie.fanart;
                        $scope.hoverTimer = setTimeout(function() {
                            $scope.$root.$broadcast('background:load', background);
                        }.bind(this), 1500);
                    };
                };

                $scope.clearHoverTimer = function() {
                    clearTimeout($scope.hoverTimer);
                };

                $scope.isTorrentClientConnected = function() {
                    return uTorrent.isConnected();
                };

                $scope.selectEpisode = function(serie, episode) {
                    $location.path('/serie/' + serie.TVDB_ID + '/season/' + episode.seasonnumber + '?episode=' + episode.TVDB_ID);
                }

            }
        };
    }
])

/**
 * The <calendar> directive is just a little wrapper around the 3rd party datePicker directive
 * that provides the calendar basics.
 *
 * It sets up the defaults and initializes the calendar.
 */
.directive('calendar', function() {
    return {
        restrict: 'E',
        template: function(element, attrs) {
            return '<div date-picker ' +
                (attrs.eventService ? 'event-service="' + attrs.eventService + '"' : '') +
                (attrs.view ? 'view="' + attrs.view + '" ' : 'view="week"') +
                (attrs.template ? 'template="' + attrs.template + '" ' : '') +
                'min-view="' + (attrs.minView || 'date') + '"' + '></div>';
        },
        link: function($scope, iElement) {
            $scope.views = ['year', 'month', 'week', 'date'];
            $scope.view = 'week';

            var calendar = iElement[0].querySelector('div[date-picker]');

            $scope.zoom = function(spaceToTheRight) {
                var cw = document.body.clientWidth;
                var avail = cw - spaceToTheRight;
                var zoom = avail / cw;
                calendar.style.transform = 'scale(' + zoom + ')';
            }
        },
        controller: function($scope, SidePanelState) {
            var calendar = this;
            this.isShowing = false;
            this.isExpanded = false;
            Object.observe(SidePanelState.state, function(newValue) {
                if (newValue[0].object.isExpanded) {
                    calendar.isExpanded = true;
                    $scope.zoom(840);
                } else if (newValue[0].object.isShowing) {
                    calendar.isShowing = true;
                    $scope.zoom(450);
                } else {
                    calendar.isExpanded = calendar.isShowing = false;

                    $scope.zoom(0);
                }
                $scope.$applyAsync();
            });

            window.addEventListener('resize', function() {
                if (calendar.isExpanded) {
                    $scope.zoom(840);
                } else if (calendar.isShowing) {
                    $scope.zoom(450);
                }
                $scope.$applyAsync();
            });
        }
    };
});