window.TorrentSearchProviders = {
    'ThePirateBay': {
        mirror: 'https://thepiratebay.cr',
        mirrorResolver: 'MirrorResolver',
        endpoints: {
            search: '/search/%s/0/7/0',
            details: '/torrent/%s'
        },
        selectors: {
            resultContainer: '#searchResult tbody tr',
            releasename: ['td:nth-child(2) > div', 'innerText',
                function(text) {
                    return text.trim();
                }
            ],
            magneturl: ['td:nth-child(2) > a', 'href'],
            size: ['td:nth-child(2) .detDesc', 'innerText',
                function(innerText) {
                    return innerText.split(', ')[1].split(' ')[1];
                }
            ],
            seeders: ['td:nth-child(3)', 'innerHTML'],
            leechers: ['td:nth-child(4)', 'innerHTML'],
            detailUrl: ['a.detLink', 'href'],
        }
    },
    'KickAssTorrents': {
        mirror: 'https://kickass.to',
        mirrorResolver: null, //'KickassMirrorResolver'
        endpoints: {
            search: '/usearch/%s/?field=seeders&sorder=desc',
            details: '/torrent/%s'
        },
        selectors: {
            resultContainer: 'table.data tr[id^=torrent]',
            releasename: ['div.torrentname a.cellMainLink', 'innerText'],
            magneturl: ['a[title="Torrent magnet link"]', 'href'],
            size: ['td:nth-child(2)', 'innerText'],
            seeders: ['td:nth-child(5)', 'innerHTML'],
            leechers: ['td:nth-child(6)', 'innerHTML'],
            detailUrl: ['div.torrentname a.cellMainLink', 'href']
        }
    },
    'Torrentz.eu': {
        mirror: 'https://torrentz.eu',
        mirrorResolver: null,
        endpoints: {
            search: '/search?f=%s',
            details: '/%s',
        },
        selectors: {
            resultContainer: 'div.results dl',
            releasename: ['dt a', 'innerText'],
            magneturl: ['dt a', 'href',
                function(a) {
                    return 'magnet:?xt=urn:sha1:' + a.substring(1);
                }
            ],
            size: ['dd span.s', 'innerText'],
            seeders: ['dd span.u', 'innerText'],
            leechers: ['dd span.d', 'innerText'],
            detailUrl: ['dt a', 'href']
        }
    },
    'OldPirateBay': {
        mirror: 'https://oldpiratebay.org',
        mirrorResolver: null,
        endpoints: {
            search: '/search.php?q=%s&Torrent_sort=seeders.desc',
            details: '/%s',
        },
        selectors: {
            resultContainer: 'table.table-torrents tbody tr',
            releasename: ['td.title-row a span', 'innerText'],
            magneturl: ['td.title-row a[title="MAGNET LINK"]', 'href'],
            size: ['td.size-row', 'innerText'],
            seeders: ['td.seeders-row', 'innerText'],
            leechers: ['td.leechers-row', 'innerText'],
            detailUrl: ['td.title-row > a', 'href']
        }
    }
}