var require = meteorInstall({"imports":{"api":{"links":{"methods-release.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/links/methods-release.js                                                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Releases, Spaces;
module.link("../collections", {
  Releases(v) {
    Releases = v;
  },

  Spaces(v) {
    Spaces = v;
  }

}, 0);
const NonEmptyString = Match.Where(x => {
  check(x, String);
  return x.length > 0;
});
Meteor.methods({
  create_release(release) {
    if (!this.userId) {
      return;
    }

    check(release, Match.ObjectIncluding({
      name: NonEmptyString,
      label: String,
      cover: Match.ObjectIncluding({
        url: String,
        id: String
      }),
      tracks: [Match.ObjectIncluding({
        contributors: Array,
        explicit: String,
        file: Object,
        genre: String,
        languageCode: String,
        recording_year: Number,
        containsLyrics: String,
        version: String,
        origin: String,
        audio: Match.ObjectIncluding({
          format: String,
          url: String,
          id: String
        })
      })],
      deliveryOptions: Match.ObjectIncluding({
        confirmed: Boolean
      }),
      languageCode: String,
      genre: String
    }));
    release.status = {
      recieved: new Date(),
      pending: true,
      approved: null,
      delivered: ""
    };
    release.type = release.tracks.length < 3 ? "Single" : release.tracks.length <= 6 ? "E.P" : "Album";

    if (!release.deliveryOptions.proposedReleaseDate) {
      release.deliveryOptions.proposedReleaseDate = moment().add(3, "days").format("YYYY-MM-DD");
    }

    release.deliveryOptions.recieved_at = moment().format('YYYY-MM-DD');
    release.recieved_at = new Date();
    let space = Spaces.findOne({
      owner: this.userId
    } //  { fields: { space: 1, _id: 0 } }
    );

    if (!space) {
      space = Meteor.users.findOne({
        'space.owner': this.userId
      }).space;
    }

    if (space) {
      release.space = space;
    } else {
      throw new Meteor.Error("How come you don't have a space");
    }

    try {
      Releases.insert(release);
    } catch (err) {
      throw new Meteor.Error("Error creating release");
    }
  },

  create_space(space_name) {
    check(space_name, String);

    if (!this.userId) {
      throw new Meteor.Error("no-user", 404, "Are you logged in?");
    } else {
      var space = {
        id: Random.id(17),
        created_at: new Date(),
        artist_name: space_name,
        owner: this.userId
      };
      Meteor.users.update({
        _id: this.userId
      }, {
        $set: {
          space: space
        }
      });
      Spaces.insert(space);
    }
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/links/methods.js                                                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
module.link("./methods-release");
let Tracks, Playlists, Albums, Activities, Artists, Genres, Youtube, UserTracks;
module.link("../collections.js", {
  Tracks(v) {
    Tracks = v;
  },

  Playlists(v) {
    Playlists = v;
  },

  Albums(v) {
    Albums = v;
  },

  Activities(v) {
    Activities = v;
  },

  Artists(v) {
    Artists = v;
  },

  Genres(v) {
    Genres = v;
  },

  Youtube(v) {
    Youtube = v;
  },

  UserTracks(v) {
    UserTracks = v;
  }

}, 2);
let People_1;
module.link("../../startup/server/register-api", {
  People_1(v) {
    People_1 = v;
  }

}, 3);

var ytdl = Npm.require("ytdl-core");

cloudinary = Npm.require("cloudinary");
cloudinary.config({
  cloud_name: "neighborhood",
  api_key: "266855682648229",
  api_secret: "snPAQH1F1mQZMXkg0PMbGSPtq80"
});
//import { People_1 } from "../../../server/main.js";
//People_1
const NonEmptyString = Match.Where(x => {
  check(x, String);
  return x.length > 0;
});

const formatImage = (id, formats) => {
  let formatted = formats.map((el, inde) => {
    return {
      url: cloudinary.url(id, {
        width: el,
        crop: "fit",
        secure: true
      }),
      width: el
    };
  });
  return formatted;
};

Meteor.methods({
  "artist.add"(artist) {
    check(artist, {
      type: String,
      stage_name: String,
      bio: Match.Maybe({
        full_name: Match.Maybe(String),
        dob: Match.Maybe(String),
        gender: Match.Maybe(String),
        origin: Match.Maybe(String),
        country: Match.Maybe(String)
      }),
      ipi: Match.Maybe(String),
      isni: Match.Maybe(String),
      notes: Match.Maybe(String),
      genre: [String]
    });
    return Artists.insert(artist);
  },

  get_full_track(id) {
    check(id, String);
    var track = {};
    var tr = Tracks.findOne({
      _id: id
    }, {
      fields: {
        _id: 1,
        album: 1,
        title: 1,
        explicit: 1,
        track_number: 1,
        featuring_artists: 1,
        languageCode: 1,
        recording_year: 1,
        type: 1,
        version: 1,
        formats: 1,
        duration: 1
      }
    });

    if (tr && tr._id) {
      track.album = Meteor.call("return_album", tr.album);
      tr.featuring_artists.forEach((e, i) => {
        let v = Meteor.call("artist_short_info", e);
        tr.featuring_artists[i] = v;
      });
      return Object.assign(tr, track);
    } else {}
  },

  create_playlist(playlist) {
    check(this.userId, String);
    check(playlist, {
      description: Match.Maybe(String),
      data: [Object],
      name: NonEmptyString,
      market: NonEmptyString,
      public: Boolean,
      plays: Match.Integer
    });

    if (this.userId == "tnm" || this.userId == "listen") {
      var fp = Object.assign({
        _id: Random.id(),
        verified: true,
        art: "",
        type: "playlist",
        author: "Listen",
        created_at: new Date()
      }, playlist);
    } else {
      var fp = Object.assign({
        _id: Random.id(),
        verified: false,
        art: "",
        type: "playlist",
        author: Meteor.call("get_user_fullName", this.userId),
        created_at: new Date()
      }, playlist);
    }

    fp.href = fp.type + "/" + fp._id;
    fp.author_userId = this.userId;
    Playlists.insert(fp);
  },

  delete_playlist(id) {
    check(id, String);
    var userId = Playlists.findOne({
      _id: id
    }, {
      fields: {
        author_userId: 1
      }
    });

    if (userId) {
      userId = userId.author_userId;
    }

    if (userId == this.userId) {
      Playlists.remove({
        _id: id
      });
    } else {
      throw new Meteor.Error("not-yours");
    }
  },

  //record track play activities
  recordPlay(media, where) {
    check(media, Match.ObjectIncluding({
      _id: String
    }));
    check(where, Match.ObjectIncluding({
      _id: String
    }));
    let userId = this.userId;

    if (where._id) {
      where.id = where._id;
    } // delete where.data


    var recentPlay = {
      _id: Random.id(),
      item: {
        title: media.title,
        id: media._id || media.id,
        _id: media._id || media.id,
        type: media.type ? media.type : "track",
        duration: media.duration,
        formats: media.formats,
        explicit: media.explicit,
        featuring_artists: media.featuring_artists,
        album: typeof media.album == "string" ? Meteor.call('return_album_info', media.album) : media.album //    where.auto_playlist ? where : typeof (media.album) == "string" ? Meteor.call('return_album', media.album) : media.album

      },
      where: where.type == 'playlist' ? where : typeof media.album === 'string' ? Meteor.call('return_album_info', media.album) : media.album,
      date: new Date()
    };

    if (userId) {
      Meteor.users.update({
        _id: userId
      }, {
        $push: {
          recently_played: {
            $each: [recentPlay]
          }
        }
      });
    }
  },

  track_play(media, where, listened) {
    check(media, Match.ObjectIncluding({
      _id: String
    }));
    check(where, Match.ObjectIncluding({
      _id: String
    }));

    if (media.user_track) {
      return;
    }

    let userId = this.userId;
    var recentPlay = {
      _id: Random.id(),
      item: {
        title: media.title,
        id: media._id || media.id,
        type: media.type ? media.type : "track",
        seconds_listened: listened
      },
      album: media.album.id ? Meteor.call('return_album_info', media.album.id) : media.album ? Meteor.call('return_album_info', media.album) : where
    };
    var activity = Object.assign({
      date: new Date(),
      userId: userId,
      name: "listened to"
    }, recentPlay);

    if (!media.usertrack) {
      Tracks.update({
        _id: media._id
      }, {
        $inc: {
          plays: 1
        }
      });
    }

    if (where.type == "playlist" && where.auto != true) {
      Playlists.update({
        _id: where._id
      }, {
        $inc: {
          plays: 1
        }
      });
    }

    Activities.insert(activity);
  },

  returnPlaylist(id) {
    check(id, String);
    var data = [];
    var playlist = Playlists.findOne({
      _id: id
    }, {
      fields: {
        last_updated: 1,
        author_userId: 1,
        name: 1,
        art: 1,
        description: 1,
        data: 1,
        author: 1,
        type: 1,
        public: 1
      }
    });
    if (playlist.data && playlist.data.length) playlist.data.forEach((el, ind) => {
      var track = Meteor.call("get_full_track", el._id);

      if (track) {
        delete track.track_number;
        delete track.plays;
        delete track.added_at;
        data.push(track);
      } else {
        throw new Meteor.Error('no Track');
      }
    });

    if (playlist.art) {
      playlist.images = Meteor.call("return_images", playlist.art);
    } else {
      playlist.images = data[0] ? data[0].album.images : [];
    } //   delete playlist.data;


    playlist.href = playlist.type + "/" + playlist._id;
    var play = Object.assign(playlist, {
      data: data
    });
    return play;
  },

  return_playlist_short(id) {
    check(id, String);
    var playlist = Playlists.findOne({
      _id: id
    }, {
      fields: {
        last_updated: 1,
        author_userId: 1,
        name: 1,
        art: 1,
        description: 1,
        author: 1,
        type: 1,
        public: 1,
        data: 1
      }
    });
    var id = playlist.data.length ? playlist.data[0]._id : false;

    if (id) {
      var track = Meteor.call("get_full_track", id);
      var images = track ? track.album.images : [];
    }

    playlist.href = playlist.type + "/" + playlist._id;

    if (playlist.art) {
      playlist.images = Meteor.call("return_images", playlist.art);
    } else {
      playlist.images = images ? images : [];
    }

    return playlist;
  },

  getUserPlaylists() {
    if (this.userId) {
      check(this.userId, String);
      let playlists = [];
      let p = Playlists.find({
        author_userId: this.userId
      }, {
        fields: {
          _id: 1
        }
      }).fetch();
      p.forEach(element => {
        playlists.push(Meteor.call("return_playlist_short", element._id));
      });
      return playlists;
    }
  },

  returnPublicPlaylists(region, verified) {
    check(region, String);
    check(verified, Boolean);
    let playlists = [];
    let p = Playlists.find({
      author_userId: {
        $ne: this.userId
      },
      public: true,
      market: region
    }, {
      fields: {
        _id: 1,
        data: {
          $slice: 20
        }
      }
    }).fetch();
    p.forEach(element => {
      playlists.push(Meteor.call("return_playlist_short", element._id));
    });
    return playlists;
  },

  add_track_to_playlist(track, playlist) {
    check(track, String);
    check(playlist, String);
    var tr = {
      _id: track,
      added_at: new Date()
    };

    if (tr) {
      var pl = Playlists.findOne(playlist, {
        fields: {
          author_userId: 1
        }
      });

      if (pl.author_userId == this.userId) {
        Playlists.update(playlist, {
          $push: {
            data: tr
          }
        });
        return;
      } else {}
    } else {
      throw new Meteor.Error("track not found");
    }
  },

  remove_from_playlist(track, playlist) {
    check(track, String);
    check(playlist, Match.ObjectIncluding({
      _id: String
    }));

    if (playlist.author_userId == this.userId) {
      Playlists.update({
        _id: playlist._id
      }, {
        $pull: {
          data: {
            _id: track
          }
        }
      }, function (err, res) {
        throw new Meteor.Error(err);
      });
    }
  },

  returnAlbumName(id) {
    check(id, String);
    return Albums.findOne(id, {
      fields: {
        name: 1
      }
    });
  },

  get_user_fullName(id) {
    check(id, String);
    var po = Meteor.users.findOne(id).tnid;
    user = People_1.findOne(po);
    return user.firstName + " " + user.lastName;
  },

  artist_short_info(artist) {
    let og = Artists.findOne({
      _id: artist
    }, {
      fields: {
        stage_name: 1,
        'profile.image': 1
      }
    });

    if (og) {
      og.type = "artist";
      og.href = og.type + "/" + og._id;
      return og;
    } else {
      throw new Meteor.Error("some-rror");
    }
  },

  add_to_library(tr) {
    check(tr, String);
    var libItem = {};

    if (this.userId) {
      let tra = Meteor.call("get_full_track", tr);
      delete tra.track_number;
      delete tra.plays;
      libItem.item = tra;
      libItem.added_at = new Date();
      Meteor.users.update({
        _id: this.userId,
        "library.item._id": {
          $ne: tr
        }
      }, {
        $push: {
          library: libItem
        }
      });
    } else {
      throw new Meteor.Error("noUserId");
    }
  },

  add_artist_to_library(tr) {
    check(tr, String);
    var libItem = {};

    if (this.userId) {
      let tra = Meteor.call("artist_short_info", tr);
      libItem.item = tra;
      libItem.added_at = new Date();
      Meteor.users.update({
        _id: this.userId,
        "library.item._id": {
          $ne: tr
        }
      }, {
        $push: {
          library: libItem
        }
      });
    } else {
      throw new Meteor.Error("noUserId");
    }
  },

  delete_user_track(id) {
    check(id, String);

    if (!this.userId) {
      return;
    } // UserTracks.remove({ _id: id, uploaded_by: this.userId });

  },

  library_recently_added() {
    return Promise.asyncApply(() => {
      if (this.userId) {
        userId = this.userId;
        var pipeline = [{
          $match: {
            _id: userId
          }
        }, {
          $unwind: "$library"
        }, {
          $match: {
            "library.item.type": "track"
          }
        }, {
          /*  $group: {
              _id: '$library.item.album.name',
              name: { $first: "$library.item.album.name" },
              data: { $push: "$library.item" },
              added_at: { $last: "$library.added_at" },
              album: { $first: "$library.item.album" },
               }
            */
          $group: {
            _id: {
              id: '$library.item.album._id',
              name: "$library.item.album.name"
            },
            data: {
              $push: "$library.item"
            },
            added_at: {
              $last: "$library.added_at"
            },
            album: {
              $first: "$library.item.album"
            }
          }
        }, {
          $project: {
            data: true,
            _id: 0,
            added_at: 1,
            album: 1,
            name: 1
          }
        }, {
          $sort: {
            added_at: -1
          }
        }];
        return Promise.await(Meteor.users.rawCollection().aggregate(pipeline).toArray());
      }
    });
  },

  get_album_tracks(album, filter) {
    return Promise.asyncApply(() => {
      check(album, String);
      var results = [];
      var tracks = Tracks.find({
        album: album
      }, {
        fields: {
          _id: 1
        }
      }).fetch();
      tracks.forEach((e, i) => {
        results.push(Meteor.call("get_full_track", e._id));
      });
      return results;
    });
  },

  library_songs() {
    return Promise.asyncApply(() => {
      if (this.userId) {
        userId = this.userId;
        var pipeline = [{
          $match: {
            _id: userId
          }
        }, {
          $unwind: "$library"
        }, {
          $match: {
            "library.item.type": "track"
          }
        }, {
          $group: {
            _id: "$library.item._id",
            track: {
              $first: "$library.item"
            },
            added_at: {
              $last: "$library.added_at"
            }
          }
        }, {
          $project: {
            track: 1,
            _id: 0,
            added_at: 1
          }
        }, {
          $sort: {
            "track.title": 1
          }
        }];
        return Promise.await(Meteor.users.rawCollection().aggregate(pipeline).toArray());
      }
    });
  },

  library_albums() {
    return Promise.asyncApply(() => {
      if (this.userId) {
        userId = this.userId;
        var pipeline = [{
          $match: {
            _id: userId
          }
        }, {
          $unwind: "$library"
        }, {
          $match: {
            "library.item.type": "track"
          }
        }, {
          $group: {
            data: {
              $push: "$library.item"
            },
            _id: "$library.item.album._id",
            added_at: {
              $last: "$library.added_at"
            },
            album: {
              $first: "$library.item.album"
            }
          }
        }, {
          $project: {
            data: true,
            _id: 0,
            added_at: 1,
            album: 1
          }
        }, {
          $sort: {
            "album.artists.stage_name": 1
          }
        }];
        return Promise.await(Meteor.users.rawCollection().aggregate(pipeline).toArray());
      }
    });
  },

  return_album(id) {
    return Promise.asyncApply(() => {
      check(id, String);
      var album = Albums.findOne({
        _id: id
      }, {
        fields: {
          release_date: 1,
          artists: 1,
          name: 1,
          album_art: 1,
          genres: 1,
          album_type: 1
        }
      });

      if (!album) {
        return;
      }

      album.artists = Promise.await(Promise.all(album.artists.map(artist => Promise.asyncApply(() => {
        let og = Artists.findOne({
          _id: artist
        }, {
          fields: {
            stage_name: 1
          }
        });
        og.type = "artist";
        og.href = og.type + "/" + og._id;
        return og;
      }))));
      album.images = [];

      for (let i = 0; i < 3; i++) {
        var want = [64, 300, 640];
        album.images.push({
          height: String(want[i]),
          width: String(want[i]),
          url: cloudinary.url(album.album_art.id, {
            width: want[i],
            crop: "fit",
            secure: true
          })
        });
      } // album.release_year = moment(album.release_date).format("YYYY");


      album.type = "album";
      album.id = album._id; // delete album._id

      delete album.album_art;
      return album;
    });
  },

  return_album_info(id) {
    return Promise.asyncApply(() => {
      check(id, String);
      var album = Albums.findOne({
        _id: id
      }, {
        fields: {
          artists: 1,
          name: 1,
          genres: 1
        }
      });

      if (!album) {
        return;
      }

      album.artists = Promise.await(Promise.all(album.artists.map(artist => Promise.asyncApply(() => {
        let og = Artists.findOne({
          _id: artist
        }, {
          fields: {
            stage_name: 1
          }
        });
        og.type = "artist";
        return og;
      }))));
      album.type = "album";
      album.id = album._id;
      return album;
    });
  },

  get_albums(ids) {
    check(ids, Array);
    var albums = Albums.find({
      _id: {
        $in: ids
      }
    }, {
      fields: {
        release_date: 1,
        artists: 1,
        name: 1,
        album_art: 1,
        genres: 1,
        album_type: 1,
        description: 1
      }
    }).fetch();

    if (albums.length) {
      albums.forEach((album, index) => {
        album.artists = album.artists.map(artist => {
          let og = Artists.findOne({
            _id: artist
          }, {
            fields: {
              stage_name: 1
            }
          });
          og.type = "artist";
          og.href = og.type + "/" + og._id;
          return og;
        });
        album.images = formatImage(album.album_art.id, [64, 300, 640]);
        album.release_year = moment(album.release_date).format("YYYY");
        album.type = "album";
        album.id = album._id;
        delete album.album_art;
      });
    }

    return albums;
  },

  return_images(id) {
    let images = [];

    for (let i = 0; i < 3; i++) {
      var want = [64, 300, 640];
      images.push({
        height: String(want[i]),
        width: String(want[i]),
        url: cloudinary.url(id, {
          width: want[i],
          crop: "fit",
          secure: true
        })
      });
    }

    return images;
  },

  return_album_full(id) {
    return Promise.asyncApply(() => {
      let album = Albums.findOne({
        _id: id
      }, {
        fields: {
          release_date: 1,
          artists: 1,
          name: 1,
          album_art: 1,
          genres: 1,
          description: 1,
          album_type: 1
        }
      });

      if (!album) {
        throw new Meteor.Error("no-album");
      }

      album.artists = Promise.await(Promise.all(album.artists.map(artist => Promise.asyncApply(() => {
        let og = Artists.findOne({
          _id: artist
        }, {
          fields: {
            stage_name: 1
          }
        });
        og.type = "artist";
        og.href = og.type + "/" + og._id;
        return og;
      }))));
      album.tracks = Tracks.find({
        album: album._id
      }, {
        fields: {
          album: 1,
          explicit: 1,
          featuring_artists: 1,
          genres: 1,
          title: 1,
          track_number: 1,
          type: 1,
          formats: 1,
          duration: 1
        },
        sort: {
          track_number: 1
        }
      }).fetch();
      album.tracks.forEach((el, index) => {
        if (el.featuring_artists.length) el.featuring_artists.forEach((e, i) => {
          let v = Meteor.call("artist_short_info", e);
          el.featuring_artists[i] = v;
        });
      });
      album.images = [];

      for (let i = 0; i < 3; i++) {
        var want = [64, 300, 640];
        album.images.push({
          height: String(want[i]),
          width: String(want[i]),
          url: cloudinary.url(album.album_art.id, {
            width: want[i],
            crop: "fit",
            secure: true
          })
        });
      }

      album.type = "album";
      album.release_year = moment(album.release_date).format("YYYY");
      album.id = album._id;
      album.href = album.type + "/" + album.id;
      delete album.album_art;
      return album;
    });
  },

  add_you_to_library(tra) {
    return Promise.asyncApply(() => {
      check(tra, {
        id: String,
        imgurl: String,
        title: NonEmptyString
      });
      var url = "https://www.youtube.com/watch?v=" + tra.id;
      var userId = this.userId;
      var notexists = Meteor.users.find({
        _id: userId,
        "library.item._id": {
          $ne: tra.id
        }
      });

      if (!notexists) {
        throw new Meteor.Error("track-exists");
      }

      check(url, String);
      var stream = cloudinary.v2.uploader.upload_stream({
        resource_type: "auto"
      }, Meteor.bindEnvironment(function (error, result) {
        if (!error) {
          var item = {
            _id: tra.id,
            added_at: new Date(),
            item: {
              //       :result.secure_url,
              album: {
                _id: "youtube",
                name: "Youtube",
                images: [{
                  url: tra.imgurl
                }, {
                  url: tra.imgurl
                }],
                artists: [{
                  id: "youtube",
                  stage_name: "Youtube"
                }]
              },
              _id: tra.id,
              title: tra.title,
              type: "track",
              duration: result.duration,
              featuring_artists: []
            }
          };
          item.item[result.format] = result.secure_url;
          Youtube.insert(item);
          Meteor.users.update({
            _id: userId,
            "library.item._id": {
              $ne: item.item._id
            }
          }, {
            $push: {
              library: item
            }
          });
          return true;
        }
      }));
      var yout = Youtube.findOne(tra.id);

      if (yout) {
        //$ne not needed , just in case.
        yout.added_at = new Date();
        Meteor.users.update({
          _id: userId,
          "library.item._id": {
            $ne: yout
          }
        }, {
          $push: {
            library: yout
          }
        });
        return true;
      } else {
        ytdl(url, {
          filter: "audioonly"
        }).pipe(stream);
      }
    });
  },

  get_artist(id) {
    check(id, String);
    let art = Artists.findOne(id);
    art.href = "artist" + "/" + art._id;
    art.profile.genres.forEach((e, i) => {
      art.profile.genres[i] = Genres.findOne(e) ? Genres.findOne(e).name : "Unknown Genre";
    });
    return art;
  },

  get_artists(artists) {
    check(artists, Array);
    let art = Artists.find({
      _id: {
        $in: artists
      }
    }).fetch();
    return art;
  },

  get_artist_lr(artist) {
    return Promise.asyncApply(() => {
      check(artist, String);
      let alb = Albums.findOne({
        artists: {
          $in: [artist]
        }
      }, {
        sort: {
          release_date: -1
        },
        fields: {
          _id: 1
        }
      });

      if (alb) {
        return Meteor.call("return_album", alb._id);
      }
    });
  },

  get_artist_topsongs(artist, lim, search) {
    return Promise.asyncApply(() => {
      check(artist, String);
      let albums = Albums.find({
        artists: {
          $in: [artist]
        }
      }, {
        fields: {
          _id: 1
        }
      }).fetch();
      let albumTracks = Promise.await(Promise.all(albums.map(album => Promise.asyncApply(() => {
        let tr = Tracks.find({
          album: album._id
        }, {
          fields: {
            _id: 1
          },
          sort: {
            plays: -1
          },
          limit: lim || 50
        }).fetch();
        return tr;
      }))));
      var artistTracks = [].concat.apply([], albumTracks);
      var arr2 = Tracks.find({
        featuring_artists: {
          $in: [artist]
        }
      }, {
        fields: {
          _id: 1
        },
        sort: {
          plays: -1
        },
        limit: lim || 50
      }).fetch();
      var toRe = artistTracks.concat(arr2).sort((a, b) => {
        if (a.plays && b.plays) {
          return b.plays - a.plays;
        } else {
          return -5;
        }
      });
      var mapo = toRe.map(x => Meteor.call("get_full_track", x._id));

      if (search) {
        return mapo;
      }

      var playlist = {
        data: mapo,
        name: "Top songs",
        _id: artist
      }; //If not Show all page

      if (!lim) {
        let name = Meteor.call("artist_short_info", artist);
        name.stage_name;
        playlist.name += " - " + name.stage_name;
      }

      return playlist;
    });
  },

  get_artist_albums(artist) {
    return Promise.asyncApply(() => {
      check(artist, String);
      let albs = Albums.find({
        artists: {
          $in: [artist]
        }
      }, {
        fields: {
          _id: 1
        },
        sort: {
          release_date: -1
        }
      }).fetch();
      var albums = albs.map(x => Meteor.call("return_album", x._id));
      return albums;
    });
  },

  get_artist_sm(id, genre) {
    return Promise.asyncApply(() => {
      check(id, String);
      check(id, String);
      var toReturn = [];
      let artists = Artists.find({
        _id: {
          $ne: id
        },
        'profile.genres': {
          $all: genre
        }
      }, {
        fields: {
          _id: 1,
          image: 1,
          cover: 1,
          type: 1,
          genres: 1,
          bio: 1,
          stage_name: 1,
          notes: 1
        },
        limit: 10
      }).fetch();
      artists.forEach((art, ind) => {
        art.href = "artist" + "/" + art._id;
        art.id = art._id;
        art.type = "artist";
        art.genres.forEach((e, i) => {
          art.genres[i] = Genres.findOne(e).name;
        });
        toReturn.push(art);
      });
      return toReturn;
    });
  },

  remove_from_library(id) {
    check(id, String);

    if (!this.userId) {
      throw new Meteor.user("nouser");
    }

    Meteor.users.update({
      _id: this.userId
    }, {
      $pull: {
        library: {
          "item._id": id
        }
      }
    });
    Meteor.users.update({
      _id: this.userId
    }, {
      $pull: {
        'recently_played': {
          'item._id': id
        }
      }
    });
  },

  like_item(item) {
    //Need Update
    check(item, String);

    if (this.userId) {
      Meteor.users.update({
        _id: this.userId
      }, {
        $push: {
          likes: item
        }
      });
    }
  },

  dislike_item(item) {
    check(item, String);

    if (this.userId) {
      Meteor.users.update({
        _id: this.userId
      }, {
        $pull: {
          likes: item
        }
      });
    }
  },

  add_artist(artist) {
    if (this.userId) {
      // let art = Meteor.call("artist_short_info", artist);
      // art.artist = artist;
      //Purposely did't check if the user is already following because should'nt happen
      //Only if some called the code manually 
      Artists.update({
        _id: artist
      }, {
        $push: {
          followers: this.userId
        }
      });
      Meteor.users.update({
        _id: this.userId,
        "artists": {
          $nin: [artist]
        }
      }, {
        $push: {
          artists: artist
        }
      });
    }
  },

  remove_artist(artist) {
    check(artist, String);

    if (this.userId) {
      Meteor.users.update({
        _id: this.userId
      }, {
        $pull: {
          artists: artist
        }
      });
    }

    Artists.update({
      _id: artist
    }, {
      $pull: {
        followers: this.userId
      }
    });
  },

  more_by_artists(artists, album) {
    return Promise.asyncApply(() => {
      check(artists, [Match.ObjectIncluding({
        _id: String
      })]);
      check(album, String);
      var albums = [];
      art = artists.map(el => {
        return el._id;
      });
      let albs = Albums.find({
        _id: {
          $ne: album
        },
        artists: {
          $in: art
        }
      }, {
        fields: {
          _id: 1
        },
        sort: {
          release_date: -1
        }
      }).fetch();
      albs.forEach(el => {
        albums.push(Meteor.call("return_album", el._id));
      });
      return albums;
    });
  },

  add_user_track(track) {
    //To Library
    check(track, Match.ObjectIncluding({
      original: String,
      title: String,
      artist: String,
      duration: Match.Integer
    }));

    if (this.userId) {
      var obj = track;
      obj.formats = [{
        url: track.original,
        format: track.format
      }];
      obj.album = {
        name: obj.album || "Unknown Album",
        images: obj.image_url ? formatImage(obj.image_url, [64, 300, 640]) : [],
        type: "album",
        _id: obj.album.length ? obj.album.replace(/\W/g, '').toLowerCase() : 'unknown',
        id: obj.album.length ? obj.album.replace(/\W/g, '').toLowerCase() : 'unknown',
        artists: [{
          stage_name: obj.artist || "Unknown Artist",
          _id: obj.artist ? obj.artist.replace(/\W/g, '').toLowerCase() : 'unknown'
        }],
        user_album: true
      };
      obj.featuring_artists = [];
      delete obj.original;
      obj.user_track = true;
      delete obj.image_url;
      obj.type = "track";
      obj._id = Random.id(10);
      var libItem = {
        item: obj,
        added_at: new Date()
      };

      try {
        Meteor.users.update({
          _id: this.userId
        }, {
          $push: {
            library: {
              $each: [libItem],
              $position: 0
            }
          }
        });
        obj.uploaded_by = this.userId;
        obj.uploaded_at = new Date();
        UserTracks.insert(obj);
      } catch (err) {
        console.log(err);
      }
    }
  },

  add_to_user_library(item) {}

});
/*
Tracks.insert({ "_id": Random.id(), "explicit": false, "featuring_artists": [], "genres": [""], "title": "Trap Trap Trap", "recording_year": 2019, "version": "original", "album": "FdNAsQjrHXmEAGDvL", "language_code": "en", "added_at": "2020-01-07T17:53:32.198Z", "plays": 0, "formats": [{ "format": "wav", "url": "https://res.cloudinary.com/neighborhood/video/upload/v1578413538/releases/JMA8PbxBrI.wav", "id": "releases/JMA8PbxBrI" }], "duration": 193.828571 }, function (err, info) {

})
*/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"collections.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/collections.js                                                                                       //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  Albums: () => Albums,
  Markets: () => Markets,
  Tracks: () => Tracks,
  Genres: () => Genres,
  Discover: () => Discover,
  Playlists: () => Playlists,
  Activities: () => Activities,
  Artists: () => Artists,
  Youtube: () => Youtube,
  UserTracks: () => UserTracks,
  Releases: () => Releases,
  Spaces: () => Spaces
});
const Albums = new Mongo.Collection("albums");
const Markets = new Mongo.Collection("markets");
const Tracks = new Mongo.Collection("tracks");
const Genres = new Mongo.Collection("genres");
const Discover = new Mongo.Collection("discover");
const Playlists = new Mongo.Collection("playlists");
const Activities = new Mongo.Collection("activities");
const Artists = new Mongo.Collection("artists");
const Youtube = new Mongo.Collection("youtube");
const UserTracks = new Mongo.Collection("usertracks");
const Releases = new Mongo.Collection("releases");
const Spaces = new Mongo.Collection('spaces');
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/publications.js                                                                                      //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Tracks, Discover, Albums, Playlists, Genres, Artists, Activities, UserTracks, Releases;
module.link("./collections", {
  Tracks(v) {
    Tracks = v;
  },

  Discover(v) {
    Discover = v;
  },

  Albums(v) {
    Albums = v;
  },

  Playlists(v) {
    Playlists = v;
  },

  Genres(v) {
    Genres = v;
  },

  Artists(v) {
    Artists = v;
  },

  Activities(v) {
    Activities = v;
  },

  UserTracks(v) {
    UserTracks = v;
  },

  Releases(v) {
    Releases = v;
  }

}, 0);
let ReactiveAggregate;
module.link("meteor/tunguska:reactive-aggregate", {
  ReactiveAggregate(v) {
    ReactiveAggregate = v;
  }

}, 1);
let People_1;
module.link("../startup/server/register-api", {
  People_1(v) {
    People_1 = v;
  }

}, 2);
Meteor.publish("userInfo", function () {
  var sub = this;
  var observeHandle = Meteor.users.find(this.userId).observeChanges({
    added: function (id, fields) {
      delete fields.artists;
      sub.added('users', id, fields);
    },
    changed: function (id, fields) {
      sub.changed('users', id, fields);
    },
    removed: function (id) {
      sub.removed('users', id);
    }
  });
});
Meteor.publish('myartists', function () {
  var sub = this;

  if (this.userId) {
    var observeHandle = Meteor.users.find(this.userId, {
      fields: {
        artists: 1
      }
    }).observeChanges({
      added: function (id, fields) {
        if (fields.artists && fields.artists.length) {
          var toreturn = fields.artists.map(el => {
            return Meteor.call('artist_short_info', el);
          });
          sub.added('users', id, {
            artists: toreturn
          });
        }
      },
      changed: function (id, fields) {
        var toreturn = fields.artists.map(el => {
          return Meteor.call('artist_short_info', el);
        });
        sub.changed('users', id, {
          artists: toreturn
        });
      }
    });
  }
});
Meteor.publish("SSOInfo", function () {
  if (this.userId) var userId = Meteor.users.findOne(this.userId, {
    fields: {
      tnid: 1
    }
  }).tnid;
  return People_1.find({
    _id: userId
  }, {
    fields: {
      firstName: 1,
      lastName: 1,
      emails: 1,
      email: 1,
      birthday: 1,
      avatar: 1
    }
  });
});
Meteor.publish("artist", function (id) {
  check(id, String);
  let art = Meteor.call('get_artist', id); //console.log(art)

  if (art) {
    art.href = art.type + "/" + art._id;
    art.id = art._id;
    art.sm = Meteor.call("get_artist_sm", id, art.profile.genres);
    art.al = Meteor.call("get_artist_albums", id);
    art.ts = Meteor.call("get_artist_topsongs", id, 24);
    art.lr = Meteor.call("get_artist_lr", id);
    this.added("artists", art._id, art);
    this.ready();
  }
});
Meteor.publish("discover_nr", function (num) {
  check(num, Match.Integer);
  var region = "UA";
  return Discover.find({
    market: region,
    name: "newreleases"
  }, {
    fields: {
      _id: 1,
      name: 1,
      market: 1,
      data: {
        $slice: num
      }
    }
  });
});
Meteor.publish("discover_featured", function () {
  var region = "UA";
  return Discover.find({
    market: region,
    name: "featured"
  });
});
Meteor.publish("discover_playlist", function () {
  var region = "UA";
  check(region, String);
  var playlists = Playlists.findOne({
    _id: "hottracksua",
    market: region,
    verified: true
  }, {
    fields: {
      _id: 1
    }
  });

  if (playlists && playlists._id) {
    var playlist = Meteor.call("returnPlaylist", playlists._id);
    this.added("playlists", playlist._id, playlist);
  }

  this.ready();
});
Meteor.publish("pub_playlists", function (limit) {
  var region = "UA";
  check(region, String);
  var playlists = Playlists.find({
    _id: {
      $ne: "hottracksua"
    },
    market: region
  }, {
    fields: {
      _id: 1
    },
    limit: limit ? limit : 30
  }); //console.log(playlists)
  // if (playlists.length) {

  playlists.forEach(e => Promise.asyncApply(() => {
    if (e._id) {
      var playlist = Promise.await(Meteor.call("return_playlist_short", e._id));
    }

    this.added("playlists", playlist._id, playlist);
  }));
  this.ready(); //  }
});
Meteor.publish("album", function (id) {
  var album = Meteor.call("return_album_full", id);
  this.added("albums", album.id, album);
  this.ready();
}); //This playlist needs to be tested

Meteor.publish("playlist", function (id) {
  check(id, String);
  var sub = this;
  var playlist = Meteor.call("returnPlaylist", id);
  var subHandle = Playlists.find({
    _id: id
  }).observeChanges({
    changed: (id, fields) => {
      var playlist = Meteor.call("returnPlaylist", id);
      sub.changed('playlists', id, playlist);
    },
    removed: id => {
      this.removed("playlists", id);
    }
  }); // if (playlist.author_userId == this.userId || playlist.public == true) {

  this.added("playlists", playlist._id, playlist);
  this.ready(); // }
});
Meteor.publish("userPlaylists", function () {
  return Playlists.find({
    author_userId: this.userId
  }, {
    fields: {
      _id: 1,
      href: 1,
      name: 1,
      author_userId: 1,
      type: 1
    }
  });
});
Meteor.publish("genres", function () {
  return Genres.find();
});
Meteor.publish("new_releases", function (limit) {
  let albums = Albums.find({
    album_type: {
      $ne: "single"
    },
    added_at: {
      $gte: new Date(new Date().getTime() - 24 * 14 * 60 * 60 * 1000)
    }
  }, {
    fields: {
      _id: 1
    },
    limit: limit ? limit : 12,
    sort: {
      added_at: -1
    }
  }).fetch();
  albums.forEach((e, i) => {
    let album = Meteor.call("return_album", e._id);
    this.added("albums", e._id, album);
  });
  this.ready();
});
Meteor.publish("new_tracks", function (lim) {
  // added_at: { $gte: new Date(new Date().getTime() - 24 * 28 * 60 * 60 * 1000) } 
  let singles = Albums.find({
    album_type: "single"
  }, {
    limit: lim ? lim : 16,
    fields: {
      _id: 1
    },
    sort: {
      added_at: -1
    }
  }).fetch();
  singles.forEach((e, i) => {
    var ft = Meteor.call("get_album_tracks", e._id);
    ft.forEach(el => {
      this.added("tracks", el._id, el);
    });
  });
  this.ready();
});
Meteor.publish("account", function () {
  if (this.userId) {
    var po = Meteor.users.findOne(this.userId).tnid;
    var user = People_1.findOne(po, {
      fields: {
        _id: 1,
        avatar: 1,
        firstName: 1,
        lastName: 1,
        birthday: 1,
        email: 1,
        emails: 1
      }
    });
    this.added("users", this.userId, user);
    this.ready();
  }
});
Meteor.publish("trending", function () {
  self = this;
  var pl = {
    _id: "toptracksua",
    data: [],
    name: "Trending Tracks",
    type: "playlist",
    auto: true
  };
  var pipeline = [{
    $match: {
      date: {
        $gte: new Date(new Date().getTime() - 24 * 7 * 60 * 60 * 1000)
      }
    }
  }, {
    $group: {
      _id: "$item.id",
      date: {
        $last: "$date"
      },
      totalPlays: {
        $sum: 1
      }
    }
  }, {
    $sort: {
      date: -1,
      totalPlays: -1
    }
  }, {
    $limit: 20
  }];
  Activities.rawCollection().aggregate(pipeline).toArray(Meteor.bindEnvironment(function (err, sort) {
    sort.forEach((el, ind) => {
      var track = Meteor.call("get_full_track", el._id);

      if (track) {
        track.position = ind + 1;
        pl.data.push(track);
      } else {//   Activities.remove({ 'item.id': el._id })
        //    console.log('DELETE ' + el._id)
      }
    });
    self.added("playlists", pl._id, pl);
  }));
  var disco1 = {
    _id: "topplaylists",
    name: "Top Playlists",
    data: [],
    market: "UA",
    auto: true
  };
  playlists = Playlists.find({
    _id: {
      $ne: "hottracksua"
    }
  }, {
    fields: {
      _id: 1
    },
    sort: {
      plays: -1
    }
  }).fetch();
  playlists.forEach((el, ind) => {
    let playlist = Meteor.call("return_playlist_short", el._id);
    playlist.position = ind + 1;
    disco1.data.push(playlist);
  });
  var pipeline = [{
    $group: {
      _id: "$album",
      totalPlays: {
        $sum: "$plays"
      }
    }
  }, {
    $sort: {
      totalPlays: -1
    }
  }];
  Tracks.rawCollection().aggregate(pipeline).toArray(Meteor.bindEnvironment(function (err, sort) {
    sort.forEach((el, ind) => {
      var album = Meteor.call("return_album", el._id);
      album.position = ind + 1;

      if (album) {
        self.added("albums", album._id, album);
      }
    });
  }));
  self.added("discover", disco1._id, disco1);
  self.ready();
});
Meteor.publish("library_songs", function () {
  userId = this.userId; // Remember, ReactiveAggregate doesn't return anything

  var pipeline = [{
    $match: {
      _id: userId
    }
  }, {
    $unwind: "$library"
  }, {
    $match: {
      "library.item.type": "track"
    }
  }, {
    $group: {
      _id: "$library.item._id",
      track: {
        $first: "$library.item"
      },
      added_at: {
        $last: "$library.added_at"
      }
    }
  }, {
    $project: {
      track: 1,
      _id: 1,
      added_at: 1
    }
  }, {
    $sort: {
      "track.title": 1
    }
  }];
  ReactiveAggregate(this, Meteor.users, // Send the aggregation to the 'clientReport' collection available for client use by using the clientCollection property of options.
  pipeline, {
    clientCollection: "librarySongs"
  });
});
Meteor.publish("myuploads", function () {
  return UserTracks.find({
    uploaded_by: this.userId
  });
});
/**
 *
 * Server Functions are below
 *
 *
 */

Meteor.publish("genre_albums", function (_id) {
  var self = this;
  check(_id, String);
  var albums = Albums.find(_id == "all" ? {} : {
    genres: {
      $in: [_id]
    }
  }, {
    fields: {
      _id: 1
    }
  }).fetch();
  var toReturn = Meteor.call("get_albums", albums.map(el => el._id));
  toReturn.forEach((el, ind) => {
    self.added("albums", el._id, el);
  });
  var observeHandle = Albums.find({}).observeChanges({
    added: function (id, fields) {},
    changed: function (id, fields) {},
    removed: function (id) {
      self.removed('albums', id);
    }
  });
  self.ready();
});
Meteor.publish("myreleases", function (space_id) {
  return Releases.find({
    "space.owner": this.userId
  }, {
    fields: {
      tracks: 0
    }
  });
});
Meteor.publish("release", function (id) {
  return Releases.find({
    _id: id,
    "space.owner": this.userId
  });
});
Router.route("/api/artists/:a", {
  where: "server"
}).get(function () {
  var self = this;
  this.response.setHeader("Content-type", "application/json");
  this.response.setHeader("Access-Control-Allow-Origin", "*");
  let artists = Artists.find({
    stage_name: {
      $regex: new RegExp(self.params.a, "i")
    }
  }).fetch();
  self.response.end(JSON.stringify(artists));
});
Meteor.publish("recently_played", function () {
  userId = this.userId; // Remember, ReactiveAggregate doesn't return anything

  var pipeline = [{
    $match: {
      _id: userId
    }
  }, {
    $unwind: "$recently_played"
  }, {
    $group: {
      _id: "$recently_played.item.album._id",
      album: {
        $last: "$recently_played.item.album"
      },
      data: {
        $last: "$recently_played.item"
      },
      date: {
        $last: "$recently_played.date"
      }
    }
  }, {
    $project: {
      album: 1,
      _id: 1,
      date: 1,
      data: 1
    }
  }, {
    $sort: {
      "date": -1
    }
  }];
  ReactiveAggregate(this, Meteor.users, // Send the aggregation to the 'clientReport' collection available for client use by using the clientCollection property of options.
  pipeline, {
    clientCollection: "recently_played"
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"both":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/startup/both/index.js                                                                                    //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("/imports/api/collections.js");
module.link("/imports/api/collections.js", {
  Markets: "Markets",
  Albums: "Albums"
}, 0);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"fixtures.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/startup/server/fixtures.js                                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/startup/server/index.js                                                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("../../api/links/methods.js");
module.link("../../api/publications.js");
module.link("./fixtures.js");
module.link("./register-api.js");
module.link("./searchIndexes.js");
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"register-api.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/startup/server/register-api.js                                                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  SharedTokens: () => SharedTokens,
  People_1: () => People_1
});
const SharedTokens = new Mongo.Collection('sharedtokens');
// Register your apis here
const accountsDomain = Meteor.settings.public.ourUrls ? Meteor.settings.public.ourUrls.accounts : "http://localhost:3005";
const NBAccounts = DDP.connect(accountsDomain);
NBAccounts.subscribe('serverContent');
const People_1 = new Mongo.Collection('users', {
  connection: NBAccounts,
  _suppressSameNameError: true
});
Accounts.registerLoginHandler("sso2", options => {
  if (!options.it) {
    return;
  }

  var valid = NBAccounts.call('validateToken', options);

  if (valid && valid.userId) {
    var LT = {
      userId: Meteor.users.findOne({
        tnid: valid.userId
      }) ? Meteor.users.findOne({
        tnid: valid.userId
      })._id : Meteor.call("createAccount", valid.userId)
    };
    return {
      userId: LT.userId
    };
  } else {
    return {
      //  userId: user._id,
      error: new Meteor.Error(403, "")
    };
  }
});
Accounts.onLogin(attempt => {
  if (attempt.type == "sso2") {
    var LT = {
      timestamp: Date.now(),
      gid: attempt.methodArguments[0].it.slice(40, 60),
      userId: attempt.user._id,
      token: Accounts._getLoginToken(attempt.connection.id)
    };
    SharedTokens.insert(LT);
    return {
      userId: LT.userId
    };
  }
});
Meteor.methods({
  'logoutUser'(user, gids) {
    var user = Meteor.users.findOne({
      tnid: user
    }, {
      fields: {
        id: 1
      }
    });
    var tokens = SharedTokens.find({
      gid: {
        $in: gids
      }
    }, {
      fields: {
        token: 1
      }
    }).fetch().map((el, index) => el.token);
    Meteor.users.update(user._id, {
      $pull: {
        'services.resume.loginTokens': {
          hashedToken: {
            $in: tokens
          }
        }
      }
    });
  }

});
Accounts.validateLoginAttempt((user, connection) => {
  return true;
});

Meteor.default_server.method_handlers["logout"] = function () {
  let accounts = Accounts;
  let user = this.userId;
  let conn = this.connection;

  var token = Accounts._getLoginToken(this.connection.id);

  accounts._setLoginToken(this.userId, this.connection, null);

  if (token && this.userId) accounts.destroyToken(this.userId, token);

  accounts._successfulLogout(this.connection, this.userId);

  this.setUserId(null);
  var tokens = SharedTokens.find({
    token: token
  }, {
    fields: {
      gid: 1,
      _id: 0
    }
  }).fetch();
  SharedTokens.update({
    token: token
  }, {
    $set: {
      status: 'inactive'
    }
  });
  var gids = tokens.map(function ({
    gid
  }, index) {
    return gid;
  });
  var id = Meteor.users.findOne(user, {
    fields: {
      tnid: 1
    }
  }).tnid;
  NBAccounts.call('logoutUser', id, gids, conn);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"searchIndexes.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/startup/server/searchIndexes.js                                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

let Tracks, Albums, Artists, Playlists;
module.link("../../api/collections.js", {
  Tracks(v) {
    Tracks = v;
  },

  Albums(v) {
    Albums = v;
  },

  Artists(v) {
    Artists = v;
  },

  Playlists(v) {
    Playlists = v;
  }

}, 0);
module.link("../../api/links/methods.js");
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);

var elasticsearch = Npm.require("elasticsearch");

var client = new elasticsearch.Client({
  host: Meteor.settings.elasticserver ? Meteor.settings.elasticserver.url : "http://192.168.31.50:9200" // log: 'trace'

});

function getUnique(arr, comp) {
  const unique = arr.map(e => e[comp]) // store the keys of the unique objects
  .map((e, i, final) => final.indexOf(e) === i && i) // eliminate the dead keys & store unique objects
  .filter(e => arr[e]).map(e => arr[e]);
  return unique;
}

Meteor.methods({
  search_songs(que) {
    return Promise.asyncApply(() => {
      var searchText = que; //  return;

      if (!que.length) {
        return [];
      }

      let lastWord = searchText.trim().split(" ").splice(-1)[0];
      let query = {
        bool: {
          must: {
            dis_max: {
              queries: [{
                match_phrase: {
                  title: {
                    query: searchText,
                    slop: 3
                  }
                }
              }, {
                match: {
                  title: {
                    query: searchText,
                    boost: 1.25
                  }
                }
              }, {
                prefix: {
                  title: searchText
                }
              }, {
                nested: {
                  path: "artists",
                  query: {
                    match: {
                      "artists.stage_name": {
                        query: searchText,
                        boost: 1.5
                      }
                    }
                  }
                }
              }, {
                nested: {
                  path: "artists",
                  query: {
                    prefix: {
                      "artists.stage_name": searchText
                    }
                  }
                }
              }, {
                nested: {
                  path: "featuring_artists",
                  query: {
                    match: {
                      "featuring_artists.stage_name": {
                        query: searchText,
                        boost: 1.25
                      }
                    }
                  }
                }
              }, {
                nested: {
                  path: "featuring_artists",
                  query: {
                    prefix: {
                      "featuring_artists.stage_name": searchText
                    }
                  }
                }
              }, {
                match: {
                  album: {
                    query: searchText,
                    boost: 1.3
                  }
                }
              }, {
                prefix: {
                  album: searchText
                }
              }]
            }
          },
          // boost: 1,
          filter: {
            term: {
              type: "track"
            }
          }
        }
      };
      let results = [];
      var result = Promise.await(client.search({
        index: "database1",
        body: {
          query: query
        }
      }));
      result.hits.hits.forEach(function (doc) {
        if (doc._source.type == "track") {
          try {
            var ta = Meteor.call("get_full_track", doc._id);

            if (ta._id) {
              results.push(ta);
            }
          } catch (err) {}
        }
      });
      return results;
    });
  },

  search_albums(sear) {
    return Promise.asyncApply(() => {
      check(sear, String);

      if (!sear.length) {
        return [];
      }

      var searchText = sear;
      var lastWord = sear.trim().split(" ").splice(-1)[0];
      let query = {
        bool: {
          filter: {
            term: {
              type: "album"
            }
          },
          must: [{
            bool: {
              should: [{
                match: {
                  name: {
                    query: searchText,
                    boost: 1.25
                  }
                }
              }, {
                prefix: {
                  name: searchText
                }
              }, {
                nested: {
                  path: "artists",
                  query: {
                    match_phrase: {
                      "artists.stage_name": searchText
                    }
                  }
                }
              }, {
                nested: {
                  path: "artists",
                  query: {
                    match_phrase_prefix: {
                      "artists.stage_name": searchText
                    }
                  }
                }
              }]
            }
          }]
        }
      };
      var result = Promise.await(client.search({
        index: "database1",
        body: {
          query: query
        }
      }));
      var wow = result.hits.hits.map(function (_ref, index) {
        let {
          _id
        } = _ref,
            nonsense = (0, _objectWithoutProperties2.default)(_ref, ["_id"]);
        return _id;
      });
      let results = Promise.await(Meteor.call("get_albums", wow));
      return results;
    });
  },

  search_artists(sear) {
    return Promise.asyncApply(() => {
      check(sear, String);

      if (!sear.length && sear.length <= 2) {
        return [];
      }

      var searchText = sear;
      var lastWord = sear.trim().split(" ").splice(-1)[0];
      var query = {
        bool: {
          must: [{
            bool: {
              should: [{
                match: {
                  stage_name: searchText
                }
              }, {
                prefix: {
                  stage_name: lastWord
                }
              }]
            }
          }],
          filter: {
            match: {
              type: "artist"
            }
          }
        }
      };
      let results = [];
      var result = Promise.await(client.search({
        index: "database1",
        body: {
          query: query
        }
      }));
      var wow = result.hits.hits.map(function (_ref2, index) {
        let {
          _id
        } = _ref2,
            nonsense = (0, _objectWithoutProperties2.default)(_ref2, ["_id"]);
        return _id;
      });
      return Meteor.call("get_artists", wow);
    });
  },

  search_playlists(sear) {
    if (!sear.length) {
      return [];
    }

    var results = [];
    var playlists = Playlists.find({
      $text: {
        $search: sear
      },
      verified: true,
      public: true,
      _id: {
        $ne: "hottracksua"
      }
    }, {
      fields: {
        _id: 1
      }
    }).fetch();
    playlists.forEach((e, i) => {
      results.push(Meteor.call("returnPlaylist", e._id));
    });
    return results;
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"models":{"user.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// models/user.js                                                                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
const USER = {
  _id: ""
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"indexer.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// server/indexer.js                                                                                                //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let Artists, Albums, Tracks;
module.link("../imports/api/collections", {
  Artists(v) {
    Artists = v;
  },

  Albums(v) {
    Albums = v;
  },

  Tracks(v) {
    Tracks = v;
  }

}, 0);

var elasticsearch = Npm.require("elasticsearch");

var client = new elasticsearch.Client({
  host: "192.168.31.50:9200" // log: 'trace'

});

function putMapping() {
  return Promise.asyncApply(() => {
    console.log("Creating Mapping index");
    client.indices.create({
      index: "database1",
      body: {
        mappings: {
          properties: {
            stage_name: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword"
                }
              }
            },
            genres: {
              type: "keyword",
              fields: {
                text: {
                  type: "text"
                }
              }
            },
            created_on: {
              type: "date"
            },
            type: {
              type: "keyword"
            },
            name: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword"
                }
              }
            },
            featuring_artists: {
              type: "nested",
              include_in_parent: true,
              properties: {
                _id: {
                  type: "keyword"
                },
                stage_name: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword"
                    }
                  }
                }
              }
            },
            artists: {
              include_in_parent: true,
              type: "nested",
              properties: {
                _id: {
                  type: "keyword"
                },
                stage_name: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword"
                    }
                  }
                }
              }
            },
            title: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword"
                }
              }
            },
            album: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword"
                }
              }
            },
            album_id: {
              type: "keyword"
            }
          }
        }
      }
    }, (err, resp, status) => {
      if (err) {
        console.error(err, status);
      } else {
        console.log("Successfully Created Index", status, resp);
      }
    });
  });
}
/*
client.indices.putMapping({
  index: "database",
  body: {
    properties: {
      name: {
        type: "text",
        fields: {
          keyword: {
            type: "text"
          }
        }
      }
    }
  }
});

*/
//putMapping();

/*client.reindex({
  body: {
    conflicts: "proceed",
    source: { index: "nelisten" },
    dest: { index: "listen2" }
  }
});
*/


var FIELDS_TO_INCLUDE = ["_id", "stage_name", "genres"];
const albums = Albums.find({}, {
  fields: {
    name: 1,
    genres: 1,
    type: 1,
    added_at: 1,
    artists: 1
  }
}).fetch();
const arti = Artists.find({}, {
  fields: {
    stage_name: 1,
    type: 1,
    genres: 1,
    created_on: 1
  }
}).fetch();
const tracks = Tracks.find({}, {
  fields: {
    title: 1,
    type: 1,
    album: 1,
    genres: 1,
    featuring_artists: 1,
    added_at: 1
  }
});

function run() {
  return Promise.asyncApply(() => {
    albums.forEach((el, index) => {
      id = el._id;
      delete el._id;
      el.type = "album";
      el.created_on = el.added_at;
      el.artists = el.artists.map((el, ind) => {
        return Artists.findOne({
          _id: el
        }, {
          fields: {
            stage_name: 1
          }
        });
      });
      delete el.added_at;
      client.index({
        id: id,
        index: "database1",
        type: "_doc",
        body: el
      }, function (err, res) {});
    });
    arti.forEach((el, index) => {
      id = el._id;
      delete el._id;
      el.created_on = new Date("2019-03-01");
      el.type = "artist";
      client.index({
        id: id,
        index: "database1",
        type: "_doc",
        body: el
      }, function (err, res) {
        console.log("Well done");
      });
    });
    tracks.forEach((el, index) => {
      id = el._id;
      delete el._id;
      el.created_on = el.added_at;
      el.type = "track";
      el.album_id = el.album;
      let al = Albums.findOne({
        _id: el.album_id
      }, {
        fields: {
          name: 1,
          _id: 0,
          artists: 1
        }
      });
      el.album = al.name;
      el.artists = al.artists.map((el, ind) => {
        return Artists.findOne({
          _id: el
        }, {
          fields: {
            stage_name: 1,
            _id: 1
          }
        });
      });
      el.featuring_artists = el.featuring_artists.map((el, ind) => {
        return Artists.findOne({
          _id: el
        }, {
          fields: {
            stage_name: 1,
            _id: 1
          }
        });
      });
      delete el.featuring_artists;
      delete el.added_at;
      client.index({
        id: id,
        index: "database1",
        type: "_doc",
        body: el
      }, function (err, res) {
        console.log("Track Added");
      });
    });
  });
} //run().catch(err => console.log({ err }));
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"main.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// server/main.js                                                                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("/imports/startup/server");
module.link("/imports/startup/both");
let MongoInternals;
module.link("meteor/mongo", {
  MongoInternals(v) {
    MongoInternals = v;
  }

}, 0);
let Markets, Albums;
module.link("/imports/api/collections.js", {
  Markets(v) {
    Markets = v;
  },

  Albums(v) {
    Albums = v;
  }

}, 1);
let Tracks, Genres;
module.link("../imports/api/collections.js", {
  Tracks(v) {
    Tracks = v;
  },

  Genres(v) {
    Genres = v;
  }

}, 2);

const Busboy = Npm.require("busboy");

const request = require("request");

try {
  const db1 = new MongoInternals.RemoteCollectionDriver(Meteor.settings.accountsDB ? Meteor.settings.accountsDB.url : "mongodb://localhost:3006/meteor", {
    reconnectTries: 120,
    reconnectInterval: 10000
  });
} catch (e) {}
/*

const db1 = new MongoInternals.RemoteCollectionDriver(
  "mongodb+srv://theneighborhood:Nucb1bBBaGtbVig9@cluster0-lr63r.gcp.mongodb.net/theneighborhood?retryWrites=true&w=majority"
);

*/


var region;
Meteor.publish("flowStart", () => {
  region = "UA";
  return [Markets.find()];
});
Meteor.publish("markets", () => {
  return Markets.find({});
});
Meteor.onConnection(e => {});
Meteor.methods({
  createAccount(userId) {
    if (Meteor.users.findOne({
      tnid: userId
    })) {
      return;
    }

    user = {};
    user["tnid"] = userId;
    user["recently_played"] = [];
    user["settings"] = {};
    user["favorites"] = [];
    user["library"] = [];
    user["created_at"] = new Date();
    user["likes"] = [];
    return Meteor.users.insert(user, function (err, r) {
      if (err) {}
    });
  }

});
Meteor.publish("user", function () {
  if (this.userId) {
    return Meteor.users.find({
      _id: this.userId
    }, {
      fields: {
        services: 0
      }
    });
  }
});
WebApp.connectHandlers.use("/api/genres", function (req, res, next) {
  res.setHeader("Content-Type", "application/javascript");
  let gr = Genres.find().fetch(); //res.statusCode = 401;

  res.end(JSON.stringify(gr)); //  next()
});
WebApp.connectHandlers.use("/uploadtrack", function (req, res, next) {
  console.log(req.url);

  if (req.method.toLowerCase() == "post") {
    var busboy = new Busboy({
      headers: req.headers
    });
    busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
      var id = makeid(10);
      var cloudinary_stream = cloudinary.v2.uploader.upload_stream({
        resource_type: "auto",
        public_id: id,
        folder: "releases"
      }, function (err, ima) {
        res.end(JSON.stringify(ima));
      });
      file.on("data", function (data) {
        cloudinary_stream.write(data);
      });
      file.on("end", function () {
        cloudinary_stream.end();
      });
    });
    req.pipe(busboy);
  } else {
    next();
  }
});
WebApp.connectHandlers.use("/upload/", function (req, res, next) {
  if (req.url == "/cover") {
    next();
  }

  if (req.method.toLowerCase() == "post") {
    var busboy = new Busboy({
      headers: req.headers
    });
    busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
      // console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
      var id = makeid(10);
      var cloudinary_stream = cloudinary.v2.uploader.upload_stream({
        resource_type: "auto",
        public_id: id,
        folder: "uploads"
      }, function (err, ima) {
        res.end(JSON.stringify(ima));
      });
      file.on("data", function (data) {
        cloudinary_stream.write(data);
      });
      file.on("end", function () {
        cloudinary_stream.end();
      });
    });
    req.pipe(busboy);
  } else {
    next();
  }
});
WebApp.connectHandlers.use("/upload/cover", function (req, res, next) {
  if (req.method.toLowerCase() == "post") {
    var busboy = new Busboy({
      headers: req.headers
    });
    busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
      // console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
      var id = makeid(10);
      var cloudinary_stream = cloudinary.v2.uploader.upload_stream({
        resource_type: "auto",
        public_id: id,
        folder: "/releases/coverarts"
      }, function (err, ima) {
        res.end(JSON.stringify(ima));
      });
      file.on("data", function (data) {
        cloudinary_stream.write(data); //    console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
      });
      file.on("end", function () {
        cloudinary_stream.end();
      });
    });
    req.pipe(busboy);
  } else {
    next();
  }
});

function makeid(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;

  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"tap-i18n":{"en.i18n.json":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// tap-i18n/en.i18n.json                                                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var _ = Package.underscore._,
    package_name = "project",
    namespace = "project";

if (package_name != "project") {
    namespace = TAPi18n.packages[package_name].namespace;
}
TAPi18n._enable({"helper_name":"_","supported_languages":null,"i18n_files_route":"/tap-i18n","preloaded_langs":[],"cdn_path":null});
TAPi18n.languages_names["en"] = ["English","English"];
// integrate the fallback language translations 
translations = {};
translations[namespace] = {"general":{"pa":"Play All","sa":"Show All","ln":"Listen Now","ra":"Recently Added","nt":"New Tracks","ht":"Hot Tracks","ns":"New Singles","lr":"Latest Release","sm":"Similar Artists","ts":"Top Songs","sf":"Shuffle","ar":"Artists","sn":"Songs","al":"Albums","pl":"Playlists","single":"Single","single_count":"Singles","mixtape":"Mixtape","ep":"E.P","cl":"Collections","pn":"Play Next","atl":"Add to Library","like":"Like","dislike":"Dislike","vm":"View More","ft":"Featured","hot":"Hot","top":"Top","fta":"From the Atmosphere","nr":"The best new releases","copy":"Copy Album Link","song":"Song","genre":"Genre","time":"Time","more":"More by","playing":"Playing Now"},"menu":{"listen":"Listen","library":"Library","stream":"Stream","youtube":"Youtube","playlists":"Your Playlists","discover":"Discover"},"library":{"previewing":"You are previewing Listen","access":"Sign up for more and get access to your online library","free":"Listen™ is Free","month":"month","credit":"No credit card, ever","unl":"Get unlimited listen time","ads":"Play your favorite music, with ads","sf":"Sign up free","login":"Log in"},"stream":{"fs":"Featured Stations"},"layouts":{"listen":{"wn":"What's New","pl":"Playlists","tr":"Trending","gn":"Genres"},"library":{"aty":"+ Add from Youtube","you":"Your Uploads"}},"trending":{"tt":"Trending Tracks","tp":"Top Playlists","ta":"Trending Albums"},"account":{"logout":"Log Out","account":"Account"},"authorization":{"listen":{"sign":"Sign Up","aha":"Already Have An Account","login":"Log in","lfm":"Looking for music","gtp":"Go To Player"},"get":{"gtrm":"Listen to what you want right now . . .","add":"Add tracks from Youtube","lib":"Create your online library","lst":"Listen to top stations in your area","crt":"Create playlists of your favorite tracks","rek":"Thousands of tracks in our free, regularly updated database"}},"sign":{"in":"Sign In","forgot":"Forgot Password","create":"Create Account","login":"Login","fb":"Login with Facebook"},"search":{"search":"Search for an Artist, Song, Album or Playlist","typing":"Start Typing"},"notifications":{"compiling":"We are currently compiling","prev":"prev","next":"next","close":"close"}};
TAPi18n._loadLangFileObject("en", translations);
TAPi18n._registerServerTranslator("en", namespace);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ru.i18n.json":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// tap-i18n/ru.i18n.json                                                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var _ = Package.underscore._,
    package_name = "project",
    namespace = "project";

if (package_name != "project") {
    namespace = TAPi18n.packages[package_name].namespace;
}
TAPi18n.languages_names["ru"] = ["Russian","Русский"];
if(_.isUndefined(TAPi18n.translations["ru"])) {
  TAPi18n.translations["ru"] = {};
}

if(_.isUndefined(TAPi18n.translations["ru"][namespace])) {
  TAPi18n.translations["ru"][namespace] = {};
}

_.extend(TAPi18n.translations["ru"][namespace], {"general":{"pa":"Слушать все","sa":"Показать все","ln":"Прослушивается сейчас","ra":"Недавно добавленные","nt":"Новые Треки","ht":"Горячие Новинки","ns":"Новые Синглы","lr":"Последний релиз","sm":"Похожие исполнители","ts":"Лучшие песни","sf":"Перемешать","ar":"Исполнители","sn":"Песни","al":"Альбомы","pl":"Плейлисты","single":"Сингл","mixtape":"Микстейп","ep":"E.P","cl":"Коллекции","pn":"Слушать следующее","atl":"Добавить в библиотеку","like":"Нравится","dislike":"Не нравится","vm":"Показать больше","ft":"Рекомендуемые","hot":"Горячие","top":"Лучшие","fta":"Из атмосферы","nr":"Лучшие новые релизы","copy":"Скопировать ссылку на альбом","song":"Песня","genre":"Жанр","time":"Время","more":"Больше","playing":"Сейчас проигрывается"},"menu":{"listen":"Слушать","library":"Библиотека","stream":"Стрим","youtube":"Youtube","playlists":"Ваши плейлисты","discover":"Обнаруженное"},"library":{"previewing":"Вы прослушали","access":"Зарегистрируйтесь для получения дополнительной информации и получите доступ к своей онлайн-библиотеке","free":"Слушать бесплатно","month":"месяц","credit":"Без кредитной карты","unl":"Получение неограниченного времени прослушивания","ads":"Прослушивание любимой музыки с рекламой","sf":"Бесплатная регистрация","login":"Авторизоваться"},"stream":{"fs":"Рекомендуемые станции"},"layouts":{"listen":{"wn":"Что нового","pl":"Плейлисты","tr":"Популярное","gn":"Жанры"},"library":{"aty":"+ Добавить с Youtube"}},"trending":{"tt":"Популярное","tp":"Лучшие Плейлисты","ta":"Популярные альбомы"},"account":{"logout":"Выйти","account":"Аккаунт"},"authorization":{"listen":{"sign":"Войти","aha":"Уже есть аккаунт","login":"Авторизоваться","lfm":"Искать музыку","gtp":"Перейти в плеер"},"get":{"gtrm":"Получите Музыку прямо сейчас","add":"Добавьте треки с Youtube","lib":"Создайте свою онлайн библиотеку","lst":"Слушайте лучшие станции в вашем районе","crt":"Создавайте плейлисты вашей любимой музыки","rek":" Тисячі треків у нашій вільній, регулярно оновлюваній базі даних"}},"sign":{"in":"Войти","forgot":"Забыли пароль?","create":"Создать аккаунт","login":"Авторизоваться","fb":"Авторизоваться через Facebook"},"search":{"search":"Поиск исполнителя, песни, альбома или плейлиста","typing":"Начните писать"},"notifications":{"compiling":"В настоящее время мы компилируем","prev":"предыдущее","next":"следующее","close":"закрыть"}});
TAPi18n._registerServerTranslator("ru", namespace);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"uk.i18n.json":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// tap-i18n/uk.i18n.json                                                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var _ = Package.underscore._,
    package_name = "project",
    namespace = "project";

if (package_name != "project") {
    namespace = TAPi18n.packages[package_name].namespace;
}
TAPi18n.languages_names["uk"] = ["Ukrainian","Українська"];
if(_.isUndefined(TAPi18n.translations["uk"])) {
  TAPi18n.translations["uk"] = {};
}

if(_.isUndefined(TAPi18n.translations["uk"][namespace])) {
  TAPi18n.translations["uk"][namespace] = {};
}

_.extend(TAPi18n.translations["uk"][namespace], {"general":{"pa":"Слухати все","sa":"Показати все","ln":"Прослуховується зараз","ra":"Нещодавно додані","nt":"Нові Треки","ht":"Горячі новинки","ns":"Нові Сингли","lr":"Останній реліз","sm":"Схожі виконавці","ts":"Найкращі пісні","sf":"Перемішати","ar":"Виконавці","sn":"Пісні","al":"Альбоми","pl":"Плейлісти","single":"Сингл","mixtape":"Мікстейп","ep":"E.P","cl":"Колекції","pn":"Слухати наступне","atl":"Додати в бібліотеку","like":"Подобається","dislike":"Не подобається","vm":"Показати більше","ft":"Рекомендовані","hot":"Гарячі","top":"Найкращі","fta":"Атмосферні","nr":"Кращі нові релізи","copy":"Копіювати посилання на альбом","song":"Пісня","genre":"Жанр","time":"Час","more":"Більше","playing":"Зараз програється"},"menu":{"listen":"Слухати","library":"Бібліотека","stream":"Стрім","youtube":"Youtube","playlists":"Ваші плейлисти","discover":"Виявлене"},"library":{"previewing":"Ви прослухали","access":"Увійдіть для отримання додаткової інформації та отримайте доступ до своєї онлайн-бібліотеки","free":"Слухати безкоштовно","month":"місяць","credit":"Без кредитної картки","unl":"Отримання необмеженого часу прослуховування","ads":"Прослуховування улюбленої музики з рекламою","sf":"Безкоштовна реєстрація","login":"Авторизуватись"},"stream":{"fs":"Рекомендовані станції"},"layouts":{"listen":{"wn":"Що нового","pl":"Плейлісти","tr":"Популярне","gn":"Жанри"},"library":{"aty":"+ Додати з Youtube"}},"trending":{"tt":"Популярне","tp":"Найкращі Плейлісти","ta":"Популярні Альбоми"},"account":{"logout":"Вийти","account":"Акаунт"},"authorization":{"listen":{"sign":"Увійти","aha":"Вже є акаунт","login":"Авторизуватись","lfm":"Шукати музику","gtp":"Перейти у плеєр"},"get":{"gtrm":"Отримайте Музику прямо зараз","add":"Додавайте треки з Youtube","lib":"Створюйте свою онлайн-бібліотеку","lst":"Слухайте найкращі станції у вашому районі","crt":"Створюйте плейлисти вашої улюбленої музики","rek":"Тысячи треков в нашей бесплатной, регулярно обновляемой базе данных"}},"sign":{"in":"Увійти","forgot":"Забули пароль?","create":"Створити акаунт","login":"Авторизуватись","fb":"Авторизуватись через Facebook"},"search":{"search":"Пошук виконавця, пісні, альбома чи плейлиста","typing":"Почніть писати"},"notifications":{"compiling":"В даний час ми компілюємо","prev":"попередня","next":"наступна","close":"закрити"}});
TAPi18n._registerServerTranslator("uk", namespace);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/models/user.js");
require("/server/indexer.js");
require("/tap-i18n/en.i18n.json");
require("/tap-i18n/ru.i18n.json");
require("/tap-i18n/uk.i18n.json");
require("/server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvbGlua3MvbWV0aG9kcy1yZWxlYXNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9saW5rcy9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9jb2xsZWN0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3N0YXJ0dXAvYm90aC9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9maXh0dXJlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9yZWdpc3Rlci1hcGkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvc3RhcnR1cC9zZXJ2ZXIvc2VhcmNoSW5kZXhlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvbW9kZWxzL3VzZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3NlcnZlci9pbmRleGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJSZWxlYXNlcyIsIlNwYWNlcyIsIm1vZHVsZSIsImxpbmsiLCJ2IiwiTm9uRW1wdHlTdHJpbmciLCJNYXRjaCIsIldoZXJlIiwieCIsImNoZWNrIiwiU3RyaW5nIiwibGVuZ3RoIiwiTWV0ZW9yIiwibWV0aG9kcyIsImNyZWF0ZV9yZWxlYXNlIiwicmVsZWFzZSIsInVzZXJJZCIsIk9iamVjdEluY2x1ZGluZyIsIm5hbWUiLCJsYWJlbCIsImNvdmVyIiwidXJsIiwiaWQiLCJ0cmFja3MiLCJjb250cmlidXRvcnMiLCJBcnJheSIsImV4cGxpY2l0IiwiZmlsZSIsIk9iamVjdCIsImdlbnJlIiwibGFuZ3VhZ2VDb2RlIiwicmVjb3JkaW5nX3llYXIiLCJOdW1iZXIiLCJjb250YWluc0x5cmljcyIsInZlcnNpb24iLCJvcmlnaW4iLCJhdWRpbyIsImZvcm1hdCIsImRlbGl2ZXJ5T3B0aW9ucyIsImNvbmZpcm1lZCIsIkJvb2xlYW4iLCJzdGF0dXMiLCJyZWNpZXZlZCIsIkRhdGUiLCJwZW5kaW5nIiwiYXBwcm92ZWQiLCJkZWxpdmVyZWQiLCJ0eXBlIiwicHJvcG9zZWRSZWxlYXNlRGF0ZSIsIm1vbWVudCIsImFkZCIsInJlY2lldmVkX2F0Iiwic3BhY2UiLCJmaW5kT25lIiwib3duZXIiLCJ1c2VycyIsIkVycm9yIiwiaW5zZXJ0IiwiZXJyIiwiY3JlYXRlX3NwYWNlIiwic3BhY2VfbmFtZSIsIlJhbmRvbSIsImNyZWF0ZWRfYXQiLCJhcnRpc3RfbmFtZSIsInVwZGF0ZSIsIl9pZCIsIiRzZXQiLCJUcmFja3MiLCJQbGF5bGlzdHMiLCJBbGJ1bXMiLCJBY3Rpdml0aWVzIiwiQXJ0aXN0cyIsIkdlbnJlcyIsIllvdXR1YmUiLCJVc2VyVHJhY2tzIiwiUGVvcGxlXzEiLCJ5dGRsIiwiTnBtIiwicmVxdWlyZSIsImNsb3VkaW5hcnkiLCJjb25maWciLCJjbG91ZF9uYW1lIiwiYXBpX2tleSIsImFwaV9zZWNyZXQiLCJmb3JtYXRJbWFnZSIsImZvcm1hdHMiLCJmb3JtYXR0ZWQiLCJtYXAiLCJlbCIsImluZGUiLCJ3aWR0aCIsImNyb3AiLCJzZWN1cmUiLCJhcnRpc3QiLCJzdGFnZV9uYW1lIiwiYmlvIiwiTWF5YmUiLCJmdWxsX25hbWUiLCJkb2IiLCJnZW5kZXIiLCJjb3VudHJ5IiwiaXBpIiwiaXNuaSIsIm5vdGVzIiwiZ2V0X2Z1bGxfdHJhY2siLCJ0cmFjayIsInRyIiwiZmllbGRzIiwiYWxidW0iLCJ0aXRsZSIsInRyYWNrX251bWJlciIsImZlYXR1cmluZ19hcnRpc3RzIiwiZHVyYXRpb24iLCJjYWxsIiwiZm9yRWFjaCIsImUiLCJpIiwiYXNzaWduIiwiY3JlYXRlX3BsYXlsaXN0IiwicGxheWxpc3QiLCJkZXNjcmlwdGlvbiIsImRhdGEiLCJtYXJrZXQiLCJwdWJsaWMiLCJwbGF5cyIsIkludGVnZXIiLCJmcCIsInZlcmlmaWVkIiwiYXJ0IiwiYXV0aG9yIiwiaHJlZiIsImF1dGhvcl91c2VySWQiLCJkZWxldGVfcGxheWxpc3QiLCJyZW1vdmUiLCJyZWNvcmRQbGF5IiwibWVkaWEiLCJ3aGVyZSIsInJlY2VudFBsYXkiLCJpdGVtIiwiZGF0ZSIsIiRwdXNoIiwicmVjZW50bHlfcGxheWVkIiwiJGVhY2giLCJ0cmFja19wbGF5IiwibGlzdGVuZWQiLCJ1c2VyX3RyYWNrIiwic2Vjb25kc19saXN0ZW5lZCIsImFjdGl2aXR5IiwidXNlcnRyYWNrIiwiJGluYyIsImF1dG8iLCJyZXR1cm5QbGF5bGlzdCIsImxhc3RfdXBkYXRlZCIsImluZCIsImFkZGVkX2F0IiwicHVzaCIsImltYWdlcyIsInBsYXkiLCJyZXR1cm5fcGxheWxpc3Rfc2hvcnQiLCJnZXRVc2VyUGxheWxpc3RzIiwicGxheWxpc3RzIiwicCIsImZpbmQiLCJmZXRjaCIsImVsZW1lbnQiLCJyZXR1cm5QdWJsaWNQbGF5bGlzdHMiLCJyZWdpb24iLCIkbmUiLCIkc2xpY2UiLCJhZGRfdHJhY2tfdG9fcGxheWxpc3QiLCJwbCIsInJlbW92ZV9mcm9tX3BsYXlsaXN0IiwiJHB1bGwiLCJyZXMiLCJyZXR1cm5BbGJ1bU5hbWUiLCJnZXRfdXNlcl9mdWxsTmFtZSIsInBvIiwidG5pZCIsInVzZXIiLCJmaXJzdE5hbWUiLCJsYXN0TmFtZSIsImFydGlzdF9zaG9ydF9pbmZvIiwib2ciLCJhZGRfdG9fbGlicmFyeSIsImxpYkl0ZW0iLCJ0cmEiLCJsaWJyYXJ5IiwiYWRkX2FydGlzdF90b19saWJyYXJ5IiwiZGVsZXRlX3VzZXJfdHJhY2siLCJsaWJyYXJ5X3JlY2VudGx5X2FkZGVkIiwicGlwZWxpbmUiLCIkbWF0Y2giLCIkdW53aW5kIiwiJGdyb3VwIiwiJGxhc3QiLCIkZmlyc3QiLCIkcHJvamVjdCIsIiRzb3J0IiwicmF3Q29sbGVjdGlvbiIsImFnZ3JlZ2F0ZSIsInRvQXJyYXkiLCJnZXRfYWxidW1fdHJhY2tzIiwiZmlsdGVyIiwicmVzdWx0cyIsImxpYnJhcnlfc29uZ3MiLCJsaWJyYXJ5X2FsYnVtcyIsInJldHVybl9hbGJ1bSIsInJlbGVhc2VfZGF0ZSIsImFydGlzdHMiLCJhbGJ1bV9hcnQiLCJnZW5yZXMiLCJhbGJ1bV90eXBlIiwiUHJvbWlzZSIsImFsbCIsIndhbnQiLCJoZWlnaHQiLCJyZXR1cm5fYWxidW1faW5mbyIsImdldF9hbGJ1bXMiLCJpZHMiLCJhbGJ1bXMiLCIkaW4iLCJpbmRleCIsInJlbGVhc2VfeWVhciIsInJldHVybl9pbWFnZXMiLCJyZXR1cm5fYWxidW1fZnVsbCIsInNvcnQiLCJhZGRfeW91X3RvX2xpYnJhcnkiLCJpbWd1cmwiLCJub3RleGlzdHMiLCJzdHJlYW0iLCJ2MiIsInVwbG9hZGVyIiwidXBsb2FkX3N0cmVhbSIsInJlc291cmNlX3R5cGUiLCJiaW5kRW52aXJvbm1lbnQiLCJlcnJvciIsInJlc3VsdCIsInNlY3VyZV91cmwiLCJ5b3V0IiwicGlwZSIsImdldF9hcnRpc3QiLCJwcm9maWxlIiwiZ2V0X2FydGlzdHMiLCJnZXRfYXJ0aXN0X2xyIiwiYWxiIiwiZ2V0X2FydGlzdF90b3Bzb25ncyIsImxpbSIsInNlYXJjaCIsImFsYnVtVHJhY2tzIiwibGltaXQiLCJhcnRpc3RUcmFja3MiLCJjb25jYXQiLCJhcHBseSIsImFycjIiLCJ0b1JlIiwiYSIsImIiLCJtYXBvIiwiZ2V0X2FydGlzdF9hbGJ1bXMiLCJhbGJzIiwiZ2V0X2FydGlzdF9zbSIsInRvUmV0dXJuIiwiJGFsbCIsImltYWdlIiwicmVtb3ZlX2Zyb21fbGlicmFyeSIsImxpa2VfaXRlbSIsImxpa2VzIiwiZGlzbGlrZV9pdGVtIiwiYWRkX2FydGlzdCIsImZvbGxvd2VycyIsIiRuaW4iLCJyZW1vdmVfYXJ0aXN0IiwibW9yZV9ieV9hcnRpc3RzIiwiYWRkX3VzZXJfdHJhY2siLCJvcmlnaW5hbCIsIm9iaiIsImltYWdlX3VybCIsInJlcGxhY2UiLCJ0b0xvd2VyQ2FzZSIsInVzZXJfYWxidW0iLCIkcG9zaXRpb24iLCJ1cGxvYWRlZF9ieSIsInVwbG9hZGVkX2F0IiwiY29uc29sZSIsImxvZyIsImFkZF90b191c2VyX2xpYnJhcnkiLCJleHBvcnQiLCJNYXJrZXRzIiwiRGlzY292ZXIiLCJNb25nbyIsIkNvbGxlY3Rpb24iLCJSZWFjdGl2ZUFnZ3JlZ2F0ZSIsInB1Ymxpc2giLCJzdWIiLCJvYnNlcnZlSGFuZGxlIiwib2JzZXJ2ZUNoYW5nZXMiLCJhZGRlZCIsImNoYW5nZWQiLCJyZW1vdmVkIiwidG9yZXR1cm4iLCJlbWFpbHMiLCJlbWFpbCIsImJpcnRoZGF5IiwiYXZhdGFyIiwic20iLCJhbCIsInRzIiwibHIiLCJyZWFkeSIsIm51bSIsInN1YkhhbmRsZSIsIiRndGUiLCJnZXRUaW1lIiwic2luZ2xlcyIsImZ0Iiwic2VsZiIsInRvdGFsUGxheXMiLCIkc3VtIiwiJGxpbWl0IiwicG9zaXRpb24iLCJkaXNjbzEiLCJjbGllbnRDb2xsZWN0aW9uIiwic3BhY2VfaWQiLCJSb3V0ZXIiLCJyb3V0ZSIsImdldCIsInJlc3BvbnNlIiwic2V0SGVhZGVyIiwiJHJlZ2V4IiwiUmVnRXhwIiwicGFyYW1zIiwiZW5kIiwiSlNPTiIsInN0cmluZ2lmeSIsIlNoYXJlZFRva2VucyIsImFjY291bnRzRG9tYWluIiwic2V0dGluZ3MiLCJvdXJVcmxzIiwiYWNjb3VudHMiLCJOQkFjY291bnRzIiwiRERQIiwiY29ubmVjdCIsInN1YnNjcmliZSIsImNvbm5lY3Rpb24iLCJfc3VwcHJlc3NTYW1lTmFtZUVycm9yIiwiQWNjb3VudHMiLCJyZWdpc3RlckxvZ2luSGFuZGxlciIsIm9wdGlvbnMiLCJpdCIsInZhbGlkIiwiTFQiLCJvbkxvZ2luIiwiYXR0ZW1wdCIsInRpbWVzdGFtcCIsIm5vdyIsImdpZCIsIm1ldGhvZEFyZ3VtZW50cyIsInNsaWNlIiwidG9rZW4iLCJfZ2V0TG9naW5Ub2tlbiIsImdpZHMiLCJ0b2tlbnMiLCJoYXNoZWRUb2tlbiIsInZhbGlkYXRlTG9naW5BdHRlbXB0IiwiZGVmYXVsdF9zZXJ2ZXIiLCJtZXRob2RfaGFuZGxlcnMiLCJjb25uIiwiX3NldExvZ2luVG9rZW4iLCJkZXN0cm95VG9rZW4iLCJfc3VjY2Vzc2Z1bExvZ291dCIsInNldFVzZXJJZCIsImVsYXN0aWNzZWFyY2giLCJjbGllbnQiLCJDbGllbnQiLCJob3N0IiwiZWxhc3RpY3NlcnZlciIsImdldFVuaXF1ZSIsImFyciIsImNvbXAiLCJ1bmlxdWUiLCJmaW5hbCIsImluZGV4T2YiLCJzZWFyY2hfc29uZ3MiLCJxdWUiLCJzZWFyY2hUZXh0IiwibGFzdFdvcmQiLCJ0cmltIiwic3BsaXQiLCJzcGxpY2UiLCJxdWVyeSIsImJvb2wiLCJtdXN0IiwiZGlzX21heCIsInF1ZXJpZXMiLCJtYXRjaF9waHJhc2UiLCJzbG9wIiwibWF0Y2giLCJib29zdCIsInByZWZpeCIsIm5lc3RlZCIsInBhdGgiLCJ0ZXJtIiwiYm9keSIsImhpdHMiLCJkb2MiLCJfc291cmNlIiwidGEiLCJzZWFyY2hfYWxidW1zIiwic2VhciIsInNob3VsZCIsIm1hdGNoX3BocmFzZV9wcmVmaXgiLCJ3b3ciLCJub25zZW5zZSIsInNlYXJjaF9hcnRpc3RzIiwic2VhcmNoX3BsYXlsaXN0cyIsIiR0ZXh0IiwiJHNlYXJjaCIsIlVTRVIiLCJwdXRNYXBwaW5nIiwiaW5kaWNlcyIsImNyZWF0ZSIsIm1hcHBpbmdzIiwicHJvcGVydGllcyIsImtleXdvcmQiLCJ0ZXh0IiwiY3JlYXRlZF9vbiIsImluY2x1ZGVfaW5fcGFyZW50IiwiYWxidW1faWQiLCJyZXNwIiwiRklFTERTX1RPX0lOQ0xVREUiLCJhcnRpIiwicnVuIiwiTW9uZ29JbnRlcm5hbHMiLCJCdXNib3kiLCJyZXF1ZXN0IiwiZGIxIiwiUmVtb3RlQ29sbGVjdGlvbkRyaXZlciIsImFjY291bnRzREIiLCJyZWNvbm5lY3RUcmllcyIsInJlY29ubmVjdEludGVydmFsIiwib25Db25uZWN0aW9uIiwiY3JlYXRlQWNjb3VudCIsInIiLCJzZXJ2aWNlcyIsIldlYkFwcCIsImNvbm5lY3RIYW5kbGVycyIsInVzZSIsInJlcSIsIm5leHQiLCJnciIsIm1ldGhvZCIsImJ1c2JveSIsImhlYWRlcnMiLCJvbiIsImZpZWxkbmFtZSIsImZpbGVuYW1lIiwiZW5jb2RpbmciLCJtaW1ldHlwZSIsIm1ha2VpZCIsImNsb3VkaW5hcnlfc3RyZWFtIiwicHVibGljX2lkIiwiZm9sZGVyIiwiaW1hIiwid3JpdGUiLCJjaGFyYWN0ZXJzIiwiY2hhcmFjdGVyc0xlbmd0aCIsImNoYXJBdCIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQSxJQUFJQSxRQUFKLEVBQWFDLE1BQWI7QUFBb0JDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZLGdCQUFaLEVBQTZCO0FBQUNILFVBQVEsQ0FBQ0ksQ0FBRCxFQUFHO0FBQUNKLFlBQVEsR0FBQ0ksQ0FBVDtBQUFXLEdBQXhCOztBQUF5QkgsUUFBTSxDQUFDRyxDQUFELEVBQUc7QUFBQ0gsVUFBTSxHQUFDRyxDQUFQO0FBQVM7O0FBQTVDLENBQTdCLEVBQTJFLENBQTNFO0FBRXBCLE1BQU1DLGNBQWMsR0FBR0MsS0FBSyxDQUFDQyxLQUFOLENBQVlDLENBQUMsSUFBSTtBQUN0Q0MsT0FBSyxDQUFDRCxDQUFELEVBQUlFLE1BQUosQ0FBTDtBQUNBLFNBQU9GLENBQUMsQ0FBQ0csTUFBRixHQUFXLENBQWxCO0FBQ0QsQ0FIc0IsQ0FBdkI7QUFLQUMsTUFBTSxDQUFDQyxPQUFQLENBQWU7QUFDYkMsZ0JBQWMsQ0FBQ0MsT0FBRCxFQUFVO0FBQ3RCLFFBQUksQ0FBQyxLQUFLQyxNQUFWLEVBQWtCO0FBQ2hCO0FBQ0Q7O0FBQ0RQLFNBQUssQ0FDSE0sT0FERyxFQUVIVCxLQUFLLENBQUNXLGVBQU4sQ0FBc0I7QUFDcEJDLFVBQUksRUFBRWIsY0FEYztBQUVwQmMsV0FBSyxFQUFFVCxNQUZhO0FBR3BCVSxXQUFLLEVBQUVkLEtBQUssQ0FBQ1csZUFBTixDQUFzQjtBQUMzQkksV0FBRyxFQUFFWCxNQURzQjtBQUUzQlks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b04sTUFBVDtBQUNELEdBdEJELE1Bc0JPO0FBQ0xILFFBQUk7QUFDTDtBQUNGLENBM0JEOztBQTZCQSxTQUFTVSxNQUFULENBQWdCL2IsTUFBaEIsRUFBd0I7QUFDdEIsTUFBSWlPLE1BQU0sR0FBRyxFQUFiO0FBQ0EsTUFBSW9PLFVBQVUsR0FDWixnRUFERjtBQUVBLE1BQUlDLGdCQUFnQixHQUFHRCxVQUFVLENBQUNyYyxNQUFsQzs7QUFDQSxPQUFLLElBQUl5RyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHekcsTUFBcEIsRUFBNEJ5RyxDQUFDLEVBQTdCLEVBQWlDO0FBQy9Cd0gsVUFBTSxJQUFJb08sVUFBVSxDQUFDRSxNQUFYLENBQWtCQyxJQUFJLENBQUNDLEtBQUwsQ0FBV0QsSUFBSSxDQUFDRSxNQUFMLEtBQWdCSixnQkFBM0IsQ0FBbEIsQ0FBVjtBQUNEOztBQUNELFNBQU9yTyxNQUFQO0FBQ0QsQyIsImZpbGUiOiIvYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUmVsZWFzZXMsIFNwYWNlcyB9IGZyb20gXCIuLi9jb2xsZWN0aW9uc1wiO1xuXG5jb25zdCBOb25FbXB0eVN0cmluZyA9IE1hdGNoLldoZXJlKHggPT4ge1xuICBjaGVjayh4LCBTdHJpbmcpO1xuICByZXR1cm4geC5sZW5ndGggPiAwO1xufSk7XG5cbk1ldGVvci5tZXRob2RzKHtcbiAgY3JlYXRlX3JlbGVhc2UocmVsZWFzZSkge1xuICAgIGlmICghdGhpcy51c2VySWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY2hlY2soXG4gICAgICByZWxlYXNlLFxuICAgICAgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcbiAgICAgICAgbmFtZTogTm9uRW1wdHlTdHJpbmcsXG4gICAgICAgIGxhYmVsOiBTdHJpbmcsXG4gICAgICAgIGNvdmVyOiBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuICAgICAgICAgIHVybDogU3RyaW5nLFxuICAgICAgICAgIGlkOiBTdHJpbmdcbiAgICAgICAgfSksXG4gICAgICAgIHRyYWNrczogW1xuICAgICAgICAgIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgICAgICAgICBjb250cmlidXRvcnM6IEFycmF5LFxuICAgICAgICAgICAgZXhwbGljaXQ6IFN0cmluZyxcbiAgICAgICAgICAgIGZpbGU6IE9iamVjdCxcbiAgICAgICAgICAgIGdlbnJlOiBTdHJpbmcsXG4gICAgICAgICAgICBsYW5ndWFnZUNvZGU6IFN0cmluZyxcbiAgICAgICAgICAgIHJlY29yZGluZ195ZWFyOiBOdW1iZXIsXG4gICAgICAgICAgICBjb250YWluc0x5cmljczogU3RyaW5nLFxuICAgICAgICAgICAgdmVyc2lvbjogU3RyaW5nLFxuICAgICAgICAgICAgb3JpZ2luOiBTdHJpbmcsXG5cbiAgICAgICAgICAgIGF1ZGlvOiBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuICAgICAgICAgICAgICBmb3JtYXQ6IFN0cmluZyxcbiAgICAgICAgICAgICAgdXJsOiBTdHJpbmcsXG4gICAgICAgICAgICAgIGlkOiBTdHJpbmdcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgXSxcblxuICAgICAgICBkZWxpdmVyeU9wdGlvbnM6IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgICAgICAgY29uZmlybWVkOiBCb29sZWFuXG4gICAgICAgIH0pLFxuICAgICAgICBsYW5ndWFnZUNvZGU6IFN0cmluZyxcbiAgICAgICAgZ2VucmU6IFN0cmluZ1xuICAgICAgfSlcbiAgICApO1xuICAgIHJlbGVhc2Uuc3RhdHVzID0ge1xuICAgICAgcmVjaWV2ZWQ6IG5ldyBEYXRlKCksXG4gICAgICBwZW5kaW5nOiB0cnVlLFxuICAgICAgYXBwcm92ZWQ6IG51bGwsXG4gICAgICBkZWxpdmVyZWQ6IFwiXCJcbiAgICB9O1xuICAgIHJlbGVhc2UudHlwZSA9XG4gICAgICByZWxlYXNlLnRyYWNrcy5sZW5ndGggPCAzXG4gICAgICAgID8gXCJTaW5nbGVcIlxuICAgICAgICA6IHJlbGVhc2UudHJhY2tzLmxlbmd0aCA8PSA2XG4gICAgICAgICAgPyBcIkUuUFwiXG4gICAgICAgICAgOiBcIkFsYnVtXCI7XG5cbiAgICBpZiAoIXJlbGVhc2UuZGVsaXZlcnlPcHRpb25zLnByb3Bvc2VkUmVsZWFzZURhdGUpIHtcbiAgICAgIHJlbGVhc2UuZGVsaXZlcnlPcHRpb25zLnByb3Bvc2VkUmVsZWFzZURhdGUgPSBtb21lbnQoKVxuICAgICAgICAuYWRkKDMsIFwiZGF5c1wiKVxuICAgICAgICAuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcblxuICAgIH1cbiAgICByZWxlYXNlLmRlbGl2ZXJ5T3B0aW9ucy5yZWNpZXZlZF9hdCA9IG1vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gICAgcmVsZWFzZS5yZWNpZXZlZF9hdCA9IG5ldyBEYXRlKClcblxuXG4gICAgbGV0IHNwYWNlID0gU3BhY2VzLmZpbmRPbmUoXG4gICAgICB7IG93bmVyOiB0aGlzLnVzZXJJZCB9LFxuICAgICAgLy8gIHsgZmllbGRzOiB7IHNwYWNlOiAxLCBfaWQ6IDAgfSB9XG4gICAgKVxuICAgIGlmICghc3BhY2UpIHtcbiAgICAgIHNwYWNlID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoeyAnc3BhY2Uub3duZXInOiB0aGlzLnVzZXJJZCB9KS5zcGFjZVxuICAgIH1cbiAgICBpZiAoc3BhY2UpIHtcbiAgICAgIHJlbGVhc2Uuc3BhY2UgPSBzcGFjZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcihcIkhvdyBjb21lIHlvdSBkb24ndCBoYXZlIGEgc3BhY2VcIik7XG5cbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIFJlbGVhc2VzLmluc2VydChyZWxlYXNlKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXCJFcnJvciBjcmVhdGluZyByZWxlYXNlXCIpO1xuICAgIH1cbiAgfSxcbiAgY3JlYXRlX3NwYWNlKHNwYWNlX25hbWUpIHtcbiAgICBjaGVjayhzcGFjZV9uYW1lLCBTdHJpbmcpO1xuICAgIGlmICghdGhpcy51c2VySWQpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXCJuby11c2VyXCIsIDQwNCwgXCJBcmUgeW91IGxvZ2dlZCBpbj9cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzcGFjZSA9IHtcbiAgICAgICAgaWQ6IFJhbmRvbS5pZCgxNyksXG4gICAgICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCksXG4gICAgICAgIGFydGlzdF9uYW1lOiBzcGFjZV9uYW1lLFxuICAgICAgICBvd25lcjogdGhpcy51c2VySWRcblxuICAgICAgfTtcblxuICAgICAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7IF9pZDogdGhpcy51c2VySWQgfSwgeyAkc2V0OiB7IHNwYWNlOiBzcGFjZSB9IH0pO1xuICAgICAgU3BhY2VzLmluc2VydChzcGFjZSlcbiAgICB9XG4gIH1cbn0pO1xuIiwiLy8gTWV0aG9kcyByZWxhdGVkIHRvIGxpbmtzXG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tIFwibWV0ZW9yL21ldGVvclwiO1xuaW1wb3J0IHsgY2hlY2sgfSBmcm9tIFwibWV0ZW9yL2NoZWNrXCI7XG5pbXBvcnQgXCIuL21ldGhvZHMtcmVsZWFzZVwiO1xudmFyIHl0ZGwgPSBOcG0ucmVxdWlyZShcInl0ZGwtY29yZVwiKTtcbmNsb3VkaW5hcnkgPSBOcG0ucmVxdWlyZShcImNsb3VkaW5hcnlcIik7XG5jbG91ZGluYXJ5LmNvbmZpZyh7XG4gIGNsb3VkX25hbWU6IFwibmVpZ2hib3Job29kXCIsXG4gIGFwaV9rZXk6IFwiMjY2ODU1NjgyNjQ4MjI5XCIsXG4gIGFwaV9zZWNyZXQ6IFwic25QQVFIMUYxbVFaTVhrZzBQTWJHU1B0cTgwXCJcbn0pO1xuXG5pbXBvcnQge1xuICBUcmFja3MsXG4gIFBsYXlsaXN0cyxcbiAgQWxidW1zLFxuICBBY3Rpdml0aWVzLFxuICBBcnRpc3RzLFxuICBHZW5yZXMsXG4gIFlvdXR1YmUsXG4gIFVzZXJUcmFja3Ncbn0gZnJvbSBcIi4uL2NvbGxlY3Rpb25zLmpzXCI7XG5pbXBvcnQgeyBQZW9wbGVfMSB9IGZyb20gXCIuLi8uLi9zdGFydHVwL3NlcnZlci9yZWdpc3Rlci1hcGlcIjtcbi8vaW1wb3J0IHsgUGVvcGxlXzEgfSBmcm9tIFwiLi4vLi4vLi4vc2VydmVyL21haW4uanNcIjtcbi8vUGVvcGxlXzFcbmNvbnN0IE5vbkVtcHR5U3RyaW5nID0gTWF0Y2guV2hlcmUoeCA9PiB7XG4gIGNoZWNrKHgsIFN0cmluZyk7XG4gIHJldHVybiB4Lmxlbmd0aCA+IDA7XG59KTtcblxuY29uc3QgZm9ybWF0SW1hZ2UgPSAoaWQsIGZvcm1hdHMpID0+IHtcbiAgbGV0IGZvcm1hdHRlZCA9IGZvcm1hdHMubWFwKChlbCwgaW5kZSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICB1cmw6IGNsb3VkaW5hcnkudXJsKGlkLCB7XG4gICAgICAgIHdpZHRoOiBlbCxcbiAgICAgICAgY3JvcDogXCJmaXRcIixcbiAgICAgICAgc2VjdXJlOiB0cnVlXG4gICAgICB9KSxcbiAgICAgIHdpZHRoOiBlbFxuICAgIH07XG4gIH0pO1xuICByZXR1cm4gZm9ybWF0dGVkO1xufTtcbk1ldGVvci5tZXRob2RzKHtcbiAgXCJhcnRpc3QuYWRkXCIoYXJ0aXN0KSB7XG4gICAgY2hlY2soYXJ0aXN0LCB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBzdGFnZV9uYW1lOiBTdHJpbmcsXG4gICAgICBiaW86IE1hdGNoLk1heWJlKHtcbiAgICAgICAgZnVsbF9uYW1lOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuICAgICAgICBkb2I6IE1hdGNoLk1heWJlKFN0cmluZyksXG4gICAgICAgIGdlbmRlcjogTWF0Y2guTWF5YmUoU3RyaW5nKSxcbiAgICAgICAgb3JpZ2luOiBNYXRjaC5NYXliZShTdHJpbmcpLFxuICAgICAgICBjb3VudHJ5OiBNYXRjaC5NYXliZShTdHJpbmcpXG4gICAgICB9KSxcbiAgICAgIGlwaTogTWF0Y2guTWF5YmUoU3RyaW5nKSxcbiAgICAgIGlzbmk6IE1hdGNoLk1heWJlKFN0cmluZyksXG4gICAgICBub3RlczogTWF0Y2guTWF5YmUoU3RyaW5nKSxcbiAgICAgIGdlbnJlOiBbU3RyaW5nXVxuICAgIH0pO1xuICAgIHJldHVybiBBcnRpc3RzLmluc2VydChhcnRpc3QpO1xuICB9LFxuICBnZXRfZnVsbF90cmFjayhpZCkge1xuICAgIGNoZWNrKGlkLCBTdHJpbmcpO1xuICAgIHZhciB0cmFjayA9IHt9O1xuICAgIHZhciB0ciA9IFRyYWNrcy5maW5kT25lKFxuICAgICAgeyBfaWQ6IGlkIH0sXG4gICAgICB7XG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIF9pZDogMSxcbiAgICAgICAgICBhbGJ1bTogMSxcbiAgICAgICAgICB0aXRsZTogMSxcbiAgICAgICAgICBleHBsaWNpdDogMSxcbiAgICAgICAgICB0cmFja19udW1iZXI6IDEsXG4gICAgICAgICAgZmVhdHVyaW5nX2FydGlzdHM6IDEsXG4gICAgICAgICAgbGFuZ3VhZ2VDb2RlOiAxLFxuICAgICAgICAgIHJlY29yZGluZ195ZWFyOiAxLFxuICAgICAgICAgIHR5cGU6IDEsXG4gICAgICAgICAgdmVyc2lvbjogMSxcbiAgICAgICAgICBmb3JtYXRzOiAxLFxuICAgICAgICAgIGR1cmF0aW9uOiAxXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKHRyICYmIHRyLl9pZCkge1xuICAgICAgdHJhY2suYWxidW0gPSBNZXRlb3IuY2FsbChcInJldHVybl9hbGJ1bVwiLCB0ci5hbGJ1bSk7XG4gICAgICB0ci5mZWF0dXJpbmdfYXJ0aXN0cy5mb3JFYWNoKChlLCBpKSA9PiB7XG4gICAgICAgIGxldCB2ID0gTWV0ZW9yLmNhbGwoXCJhcnRpc3Rfc2hvcnRfaW5mb1wiLCBlKTtcbiAgICAgICAgdHIuZmVhdHVyaW5nX2FydGlzdHNbaV0gPSB2O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih0ciwgdHJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgfVxuICB9LFxuICBjcmVhdGVfcGxheWxpc3QocGxheWxpc3QpIHtcbiAgICBjaGVjayh0aGlzLnVzZXJJZCwgU3RyaW5nKTtcbiAgICBjaGVjayhwbGF5bGlzdCwge1xuICAgICAgZGVzY3JpcHRpb246IE1hdGNoLk1heWJlKFN0cmluZyksXG4gICAgICBkYXRhOiBbT2JqZWN0XSxcbiAgICAgIG5hbWU6IE5vbkVtcHR5U3RyaW5nLFxuICAgICAgbWFya2V0OiBOb25FbXB0eVN0cmluZyxcbiAgICAgIHB1YmxpYzogQm9vbGVhbixcbiAgICAgIHBsYXlzOiBNYXRjaC5JbnRlZ2VyXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy51c2VySWQgPT0gXCJ0bm1cIiB8fCB0aGlzLnVzZXJJZCA9PSBcImxpc3RlblwiKSB7XG4gICAgICB2YXIgZnAgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICB7XG4gICAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcbiAgICAgICAgICB2ZXJpZmllZDogdHJ1ZSxcbiAgICAgICAgICBhcnQ6IFwiXCIsXG4gICAgICAgICAgdHlwZTogXCJwbGF5bGlzdFwiLFxuICAgICAgICAgIGF1dGhvcjogXCJMaXN0ZW5cIixcbiAgICAgICAgICBjcmVhdGVkX2F0OiBuZXcgRGF0ZSgpXG4gICAgICAgIH0sXG4gICAgICAgIHBsYXlsaXN0XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZnAgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICB7XG4gICAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcbiAgICAgICAgICB2ZXJpZmllZDogZmFsc2UsXG4gICAgICAgICAgYXJ0OiBcIlwiLFxuICAgICAgICAgIHR5cGU6IFwicGxheWxpc3RcIixcbiAgICAgICAgICBhdXRob3I6IE1ldGVvci5jYWxsKFwiZ2V0X3VzZXJfZnVsbE5hbWVcIiwgdGhpcy51c2VySWQpLFxuICAgICAgICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKClcbiAgICAgICAgfSxcbiAgICAgICAgcGxheWxpc3RcbiAgICAgICk7XG4gICAgfVxuICAgIGZwLmhyZWYgPSBmcC50eXBlICsgXCIvXCIgKyBmcC5faWQ7XG4gICAgZnAuYXV0aG9yX3VzZXJJZCA9IHRoaXMudXNlcklkO1xuICAgIFBsYXlsaXN0cy5pbnNlcnQoZnApO1xuICB9LFxuICBkZWxldGVfcGxheWxpc3QoaWQpIHtcbiAgICBjaGVjayhpZCwgU3RyaW5nKTtcbiAgICB2YXIgdXNlcklkID0gUGxheWxpc3RzLmZpbmRPbmUoXG4gICAgICB7IF9pZDogaWQgfSxcbiAgICAgIHsgZmllbGRzOiB7IGF1dGhvcl91c2VySWQ6IDEgfSB9XG4gICAgKTtcbiAgICBpZiAodXNlcklkKSB7XG4gICAgICB1c2VySWQgPSB1c2VySWQuYXV0aG9yX3VzZXJJZDtcbiAgICB9XG4gICAgaWYgKHVzZXJJZCA9PSB0aGlzLnVzZXJJZCkge1xuICAgICAgUGxheWxpc3RzLnJlbW92ZSh7IF9pZDogaWQgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXCJub3QteW91cnNcIik7XG4gICAgfVxuICB9LFxuICAvL3JlY29yZCB0cmFjayBwbGF5IGFjdGl2aXRpZXNcbiAgcmVjb3JkUGxheShtZWRpYSwgd2hlcmUpIHtcblxuICAgIGNoZWNrKFxuICAgICAgbWVkaWEsXG4gICAgICBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuICAgICAgICBfaWQ6IFN0cmluZ1xuICAgICAgfSlcbiAgICApO1xuICAgIGNoZWNrKFxuICAgICAgd2hlcmUsXG4gICAgICBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuICAgICAgICBfaWQ6IFN0cmluZ1xuICAgICAgfSlcbiAgICApO1xuXG4gICAgbGV0IHVzZXJJZCA9IHRoaXMudXNlcklkO1xuICAgIGlmICh3aGVyZS5faWQpIHtcbiAgICAgIHdoZXJlLmlkID0gd2hlcmUuX2lkXG4gICAgfVxuICAgIC8vIGRlbGV0ZSB3aGVyZS5kYXRhXG4gICAgdmFyIHJlY2VudFBsYXkgPSB7XG4gICAgICBfaWQ6IFJhbmRvbS5pZCgpLFxuICAgICAgaXRlbToge1xuICAgICAgICB0aXRsZTogbWVkaWEudGl0bGUsXG4gICAgICAgIGlkOiBtZWRpYS5faWQgfHwgbWVkaWEuaWQsXG4gICAgICAgIF9pZDogbWVkaWEuX2lkIHx8IG1lZGlhLmlkLFxuICAgICAgICB0eXBlOiBtZWRpYS50eXBlID8gbWVkaWEudHlwZSA6IFwidHJhY2tcIixcbiAgICAgICAgZHVyYXRpb246IG1lZGlhLmR1cmF0aW9uLFxuICAgICAgICBmb3JtYXRzOiBtZWRpYS5mb3JtYXRzLFxuICAgICAgICBleHBsaWNpdDogbWVkaWEuZXhwbGljaXQsXG4gICAgICAgIGZlYXR1cmluZ19hcnRpc3RzOiBtZWRpYS5mZWF0dXJpbmdfYXJ0aXN0cyxcbiAgICAgICAgYWxidW06IHR5cGVvZiAobWVkaWEuYWxidW0pID09IFwic3RyaW5nXCIgPyBNZXRlb3IuY2FsbCgncmV0dXJuX2FsYnVtX2luZm8nLCBtZWRpYS5hbGJ1bSkgOiBtZWRpYS5hbGJ1bVxuICAgICAgICAvLyAgICB3aGVyZS5hdXRvX3BsYXlsaXN0ID8gd2hlcmUgOiB0eXBlb2YgKG1lZGlhLmFsYnVtKSA9PSBcInN0cmluZ1wiID8gTWV0ZW9yLmNhbGwoJ3JldHVybl9hbGJ1bScsIG1lZGlhLmFsYnVtKSA6IG1lZGlhLmFsYnVtXG5cbiAgICAgIH0sXG4gICAgICB3aGVyZTogd2hlcmUudHlwZSA9PSAncGxheWxpc3QnID8gd2hlcmUgOiB0eXBlb2YgKG1lZGlhLmFsYnVtKSA9PT0gJ3N0cmluZycgPyBNZXRlb3IuY2FsbCgncmV0dXJuX2FsYnVtX2luZm8nLCBtZWRpYS5hbGJ1bSkgOiBtZWRpYS5hbGJ1bSxcbiAgICAgIGRhdGU6IG5ldyBEYXRlKClcbiAgICB9O1xuICAgIGlmICh1c2VySWQpIHtcbiAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoXG4gICAgICAgIHsgX2lkOiB1c2VySWQgfSxcbiAgICAgICAgeyAkcHVzaDogeyByZWNlbnRseV9wbGF5ZWQ6IHsgJGVhY2g6IFtyZWNlbnRQbGF5XSB9IH0gfVxuICAgICAgKTtcbiAgICB9XG4gIH0sIHRyYWNrX3BsYXkobWVkaWEsIHdoZXJlLCBsaXN0ZW5lZCkge1xuXG4gICAgY2hlY2soXG4gICAgICBtZWRpYSxcbiAgICAgIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgICAgIF9pZDogU3RyaW5nXG4gICAgICB9KVxuICAgICk7XG4gICAgY2hlY2soXG4gICAgICB3aGVyZSxcbiAgICAgIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgICAgIF9pZDogU3RyaW5nXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBpZiAobWVkaWEudXNlcl90cmFjaykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGxldCB1c2VySWQgPSB0aGlzLnVzZXJJZDtcbiAgICB2YXIgcmVjZW50UGxheSA9IHtcbiAgICAgIF9pZDogUmFuZG9tLmlkKCksXG4gICAgICBpdGVtOiB7XG4gICAgICAgIHRpdGxlOiBtZWRpYS50aXRsZSxcbiAgICAgICAgaWQ6IG1lZGlhLl9pZCB8fCBtZWRpYS5pZCxcbiAgICAgICAgdHlwZTogbWVkaWEudHlwZSA/IG1lZGlhLnR5cGUgOiBcInRyYWNrXCIsXG4gICAgICAgIHNlY29uZHNfbGlzdGVuZWQ6IGxpc3RlbmVkXG4gICAgICB9LFxuICAgICAgYWxidW06IG1lZGlhLmFsYnVtLmlkID8gTWV0ZW9yLmNhbGwoJ3JldHVybl9hbGJ1bV9pbmZvJywgbWVkaWEuYWxidW0uaWQpIDogbWVkaWEuYWxidW0gPyBNZXRlb3IuY2FsbCgncmV0dXJuX2FsYnVtX2luZm8nLCBtZWRpYS5hbGJ1bSkgOiB3aGVyZSxcblxuICAgIH07XG4gICAgdmFyIGFjdGl2aXR5ID0gT2JqZWN0LmFzc2lnbihcbiAgICAgIHsgZGF0ZTogbmV3IERhdGUoKSwgdXNlcklkOiB1c2VySWQsIG5hbWU6IFwibGlzdGVuZWQgdG9cIiB9LFxuICAgICAgcmVjZW50UGxheVxuICAgICk7XG4gICAgaWYgKCFtZWRpYS51c2VydHJhY2spIHtcblxuXG4gICAgICBUcmFja3MudXBkYXRlKHsgX2lkOiBtZWRpYS5faWQgfSwgeyAkaW5jOiB7IHBsYXlzOiAxIH0gfSk7XG4gICAgfVxuICAgIGlmICh3aGVyZS50eXBlID09IFwicGxheWxpc3RcIiAmJiB3aGVyZS5hdXRvICE9IHRydWUpIHtcbiAgICAgIFBsYXlsaXN0cy51cGRhdGUoeyBfaWQ6IHdoZXJlLl9pZCB9LCB7ICRpbmM6IHsgcGxheXM6IDEgfSB9KTtcbiAgICB9XG5cbiAgICBBY3Rpdml0aWVzLmluc2VydChhY3Rpdml0eSk7XG4gIH0sXG4gIHJldHVyblBsYXlsaXN0KGlkKSB7XG4gICAgY2hlY2soaWQsIFN0cmluZyk7XG4gICAgdmFyIGRhdGEgPSBbXTtcbiAgICB2YXIgcGxheWxpc3QgPSBQbGF5bGlzdHMuZmluZE9uZShcbiAgICAgIHsgX2lkOiBpZCB9LFxuICAgICAge1xuICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICBsYXN0X3VwZGF0ZWQ6IDEsXG4gICAgICAgICAgYXV0aG9yX3VzZXJJZDogMSxcbiAgICAgICAgICBuYW1lOiAxLFxuICAgICAgICAgIGFydDogMSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogMSxcbiAgICAgICAgICBkYXRhOiAxLFxuICAgICAgICAgIGF1dGhvcjogMSxcbiAgICAgICAgICB0eXBlOiAxLFxuICAgICAgICAgIHB1YmxpYzogMVxuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcblxuICAgIGlmIChwbGF5bGlzdC5kYXRhICYmIHBsYXlsaXN0LmRhdGEubGVuZ3RoKVxuICAgICAgcGxheWxpc3QuZGF0YS5mb3JFYWNoKChlbCwgaW5kKSA9PiB7XG4gICAgICAgIHZhciB0cmFjayA9IE1ldGVvci5jYWxsKFwiZ2V0X2Z1bGxfdHJhY2tcIiwgZWwuX2lkKTtcbiAgICAgICAgaWYgKHRyYWNrKSB7XG4gICAgICAgICAgZGVsZXRlIHRyYWNrLnRyYWNrX251bWJlcjtcbiAgICAgICAgICBkZWxldGUgdHJhY2sucGxheXM7XG4gICAgICAgICAgZGVsZXRlIHRyYWNrLmFkZGVkX2F0O1xuXG4gICAgICAgICAgZGF0YS5wdXNoKHRyYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdubyBUcmFjaycpXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIGlmIChwbGF5bGlzdC5hcnQpIHtcbiAgICAgIHBsYXlsaXN0LmltYWdlcyA9IE1ldGVvci5jYWxsKFwicmV0dXJuX2ltYWdlc1wiLCBwbGF5bGlzdC5hcnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwbGF5bGlzdC5pbWFnZXMgPSBkYXRhWzBdID8gZGF0YVswXS5hbGJ1bS5pbWFnZXMgOiBbXTtcbiAgICB9XG4gICAgLy8gICBkZWxldGUgcGxheWxpc3QuZGF0YTtcbiAgICBwbGF5bGlzdC5ocmVmID0gcGxheWxpc3QudHlwZSArIFwiL1wiICsgcGxheWxpc3QuX2lkO1xuICAgIHZhciBwbGF5ID0gT2JqZWN0LmFzc2lnbihwbGF5bGlzdCwgeyBkYXRhOiBkYXRhIH0pO1xuICAgIHJldHVybiBwbGF5O1xuXG4gIH0sXG4gIHJldHVybl9wbGF5bGlzdF9zaG9ydChpZCkge1xuICAgIGNoZWNrKGlkLCBTdHJpbmcpO1xuICAgIHZhciBwbGF5bGlzdCA9IFBsYXlsaXN0cy5maW5kT25lKFxuICAgICAgeyBfaWQ6IGlkIH0sXG4gICAgICB7XG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIGxhc3RfdXBkYXRlZDogMSxcbiAgICAgICAgICBhdXRob3JfdXNlcklkOiAxLFxuICAgICAgICAgIG5hbWU6IDEsXG4gICAgICAgICAgYXJ0OiAxLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAxLFxuICAgICAgICAgIGF1dGhvcjogMSxcbiAgICAgICAgICB0eXBlOiAxLFxuICAgICAgICAgIHB1YmxpYzogMSxcbiAgICAgICAgICBkYXRhOiAxXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuICAgIHZhciBpZCA9IHBsYXlsaXN0LmRhdGEubGVuZ3RoID8gcGxheWxpc3QuZGF0YVswXS5faWQgOiBmYWxzZTtcbiAgICBpZiAoaWQpIHtcbiAgICAgIHZhciB0cmFjayA9IE1ldGVvci5jYWxsKFwiZ2V0X2Z1bGxfdHJhY2tcIiwgaWQpO1xuICAgICAgdmFyIGltYWdlcyA9IHRyYWNrID8gdHJhY2suYWxidW0uaW1hZ2VzIDogW107XG4gICAgfVxuXG4gICAgcGxheWxpc3QuaHJlZiA9IHBsYXlsaXN0LnR5cGUgKyBcIi9cIiArIHBsYXlsaXN0Ll9pZDtcbiAgICBpZiAocGxheWxpc3QuYXJ0KSB7XG4gICAgICBwbGF5bGlzdC5pbWFnZXMgPSBNZXRlb3IuY2FsbChcInJldHVybl9pbWFnZXNcIiwgcGxheWxpc3QuYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGxheWxpc3QuaW1hZ2VzID0gaW1hZ2VzID8gaW1hZ2VzIDogW107XG4gICAgfVxuICAgIHJldHVybiBwbGF5bGlzdDtcbiAgfSxcbiAgZ2V0VXNlclBsYXlsaXN0cygpIHtcbiAgICBpZiAodGhpcy51c2VySWQpIHtcbiAgICAgIGNoZWNrKHRoaXMudXNlcklkLCBTdHJpbmcpO1xuICAgICAgbGV0IHBsYXlsaXN0cyA9IFtdO1xuICAgICAgbGV0IHAgPSBQbGF5bGlzdHMuZmluZChcbiAgICAgICAgeyBhdXRob3JfdXNlcklkOiB0aGlzLnVzZXJJZCB9LFxuICAgICAgICB7IGZpZWxkczogeyBfaWQ6IDEgfSB9XG4gICAgICApLmZldGNoKCk7XG4gICAgICBwLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIHBsYXlsaXN0cy5wdXNoKE1ldGVvci5jYWxsKFwicmV0dXJuX3BsYXlsaXN0X3Nob3J0XCIsIGVsZW1lbnQuX2lkKSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwbGF5bGlzdHM7XG4gICAgfVxuICB9LFxuICByZXR1cm5QdWJsaWNQbGF5bGlzdHMocmVnaW9uLCB2ZXJpZmllZCkge1xuICAgIGNoZWNrKHJlZ2lvbiwgU3RyaW5nKTtcbiAgICBjaGVjayh2ZXJpZmllZCwgQm9vbGVhbik7XG4gICAgbGV0IHBsYXlsaXN0cyA9IFtdO1xuICAgIGxldCBwID0gUGxheWxpc3RzLmZpbmQoXG4gICAgICB7IGF1dGhvcl91c2VySWQ6IHsgJG5lOiB0aGlzLnVzZXJJZCB9LCBwdWJsaWM6IHRydWUsIG1hcmtldDogcmVnaW9uIH0sXG4gICAgICB7IGZpZWxkczogeyBfaWQ6IDEsIGRhdGE6IHsgJHNsaWNlOiAyMCB9IH0gfVxuICAgICkuZmV0Y2goKTtcbiAgICBwLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICBwbGF5bGlzdHMucHVzaChNZXRlb3IuY2FsbChcInJldHVybl9wbGF5bGlzdF9zaG9ydFwiLCBlbGVtZW50Ll9pZCkpO1xuICAgIH0pO1xuICAgIHJldHVybiBwbGF5bGlzdHM7XG4gIH0sXG4gIGFkZF90cmFja190b19wbGF5bGlzdCh0cmFjaywgcGxheWxpc3QpIHtcbiAgICBjaGVjayh0cmFjaywgU3RyaW5nKTtcbiAgICBjaGVjayhwbGF5bGlzdCwgU3RyaW5nKTtcbiAgICB2YXIgdHIgPSB7XG4gICAgICBfaWQ6IHRyYWNrLFxuICAgICAgYWRkZWRfYXQ6IG5ldyBEYXRlKClcbiAgICB9O1xuICAgIGlmICh0cikge1xuICAgICAgdmFyIHBsID0gUGxheWxpc3RzLmZpbmRPbmUocGxheWxpc3QsIHsgZmllbGRzOiB7IGF1dGhvcl91c2VySWQ6IDEgfSB9KTtcbiAgICAgIGlmIChwbC5hdXRob3JfdXNlcklkID09IHRoaXMudXNlcklkKSB7XG4gICAgICAgIFBsYXlsaXN0cy51cGRhdGUocGxheWxpc3QsIHsgJHB1c2g6IHsgZGF0YTogdHIgfSB9KTtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9IGVsc2Uge1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFwidHJhY2sgbm90IGZvdW5kXCIpO1xuICAgIH1cbiAgfSxcbiAgcmVtb3ZlX2Zyb21fcGxheWxpc3QodHJhY2ssIHBsYXlsaXN0KSB7XG4gICAgY2hlY2sodHJhY2ssIFN0cmluZyk7XG4gICAgY2hlY2socGxheWxpc3QsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7IF9pZDogU3RyaW5nIH0pKTtcbiAgICBpZiAocGxheWxpc3QuYXV0aG9yX3VzZXJJZCA9PSB0aGlzLnVzZXJJZCkge1xuICAgICAgUGxheWxpc3RzLnVwZGF0ZShcbiAgICAgICAgeyBfaWQ6IHBsYXlsaXN0Ll9pZCB9LFxuICAgICAgICB7ICRwdWxsOiB7IGRhdGE6IHsgX2lkOiB0cmFjayB9IH0gfVxuICAgICAgICAsIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoZXJyKVxuICAgICAgICB9KTtcblxuICAgIH1cbiAgfSxcbiAgcmV0dXJuQWxidW1OYW1lKGlkKSB7XG4gICAgY2hlY2soaWQsIFN0cmluZyk7XG4gICAgcmV0dXJuIEFsYnVtcy5maW5kT25lKGlkLCB7IGZpZWxkczogeyBuYW1lOiAxIH0gfSk7XG4gIH0sXG4gIGdldF91c2VyX2Z1bGxOYW1lKGlkKSB7XG4gICAgY2hlY2soaWQsIFN0cmluZyk7XG4gICAgdmFyIHBvID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoaWQpLnRuaWQ7XG4gICAgdXNlciA9IFBlb3BsZV8xLmZpbmRPbmUocG8pO1xuICAgIHJldHVybiB1c2VyLmZpcnN0TmFtZSArIFwiIFwiICsgdXNlci5sYXN0TmFtZTtcbiAgfSxcbiAgYXJ0aXN0X3Nob3J0X2luZm8oYXJ0aXN0KSB7XG4gICAgbGV0IG9nID0gQXJ0aXN0cy5maW5kT25lKFxuICAgICAgeyBfaWQ6IGFydGlzdCB9LFxuICAgICAgeyBmaWVsZHM6IHsgc3RhZ2VfbmFtZTogMSwgJ3Byb2ZpbGUuaW1hZ2UnOiAxIH0gfVxuICAgICk7XG4gICAgaWYgKG9nKSB7XG4gICAgICBvZy50eXBlID0gXCJhcnRpc3RcIjtcbiAgICAgIG9nLmhyZWYgPSBvZy50eXBlICsgXCIvXCIgKyBvZy5faWQ7XG5cbiAgICAgIHJldHVybiBvZztcblxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFwic29tZS1ycm9yXCIpO1xuICAgIH1cbiAgfSxcbiAgYWRkX3RvX2xpYnJhcnkodHIpIHtcbiAgICBjaGVjayh0ciwgU3RyaW5nKTtcbiAgICB2YXIgbGliSXRlbSA9IHt9O1xuICAgIGlmICh0aGlzLnVzZXJJZCkge1xuICAgICAgbGV0IHRyYSA9IE1ldGVvci5jYWxsKFwiZ2V0X2Z1bGxfdHJhY2tcIiwgdHIpO1xuICAgICAgZGVsZXRlIHRyYS50cmFja19udW1iZXI7XG4gICAgICBkZWxldGUgdHJhLnBsYXlzO1xuICAgICAgbGliSXRlbS5pdGVtID0gdHJhO1xuICAgICAgbGliSXRlbS5hZGRlZF9hdCA9IG5ldyBEYXRlKCk7XG4gICAgICBNZXRlb3IudXNlcnMudXBkYXRlKFxuICAgICAgICB7IF9pZDogdGhpcy51c2VySWQsIFwibGlicmFyeS5pdGVtLl9pZFwiOiB7ICRuZTogdHIgfSB9LFxuICAgICAgICB7ICRwdXNoOiB7IGxpYnJhcnk6IGxpYkl0ZW0gfSB9XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFwibm9Vc2VySWRcIik7XG4gICAgfVxuICB9LFxuICBhZGRfYXJ0aXN0X3RvX2xpYnJhcnkodHIpIHtcbiAgICBjaGVjayh0ciwgU3RyaW5nKTtcbiAgICB2YXIgbGliSXRlbSA9IHt9O1xuICAgIGlmICh0aGlzLnVzZXJJZCkge1xuICAgICAgbGV0IHRyYSA9IE1ldGVvci5jYWxsKFwiYXJ0aXN0X3Nob3J0X2luZm9cIiwgdHIpO1xuICAgICAgbGliSXRlbS5pdGVtID0gdHJhO1xuICAgICAgbGliSXRlbS5hZGRlZF9hdCA9IG5ldyBEYXRlKCk7XG4gICAgICBNZXRlb3IudXNlcnMudXBkYXRlKFxuICAgICAgICB7IF9pZDogdGhpcy51c2VySWQsIFwibGlicmFyeS5pdGVtLl9pZFwiOiB7ICRuZTogdHIgfSB9LFxuICAgICAgICB7ICRwdXNoOiB7IGxpYnJhcnk6IGxpYkl0ZW0gfSB9XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFwibm9Vc2VySWRcIik7XG4gICAgfVxuICB9LFxuICBkZWxldGVfdXNlcl90cmFjayhpZCkge1xuXG4gICAgY2hlY2soaWQsIFN0cmluZyk7XG4gICAgaWYgKCF0aGlzLnVzZXJJZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG5cblxuICAgIC8vIFVzZXJUcmFja3MucmVtb3ZlKHsgX2lkOiBpZCwgdXBsb2FkZWRfYnk6IHRoaXMudXNlcklkIH0pO1xuICB9LFxuXG4gIGFzeW5jIGxpYnJhcnlfcmVjZW50bHlfYWRkZWQoKSB7XG4gICAgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgICB1c2VySWQgPSB0aGlzLnVzZXJJZDtcbiAgICAgIHZhciBwaXBlbGluZSA9IFtcbiAgICAgICAgeyAkbWF0Y2g6IHsgX2lkOiB1c2VySWQgfSB9LFxuICAgICAgICB7ICR1bndpbmQ6IFwiJGxpYnJhcnlcIiB9LFxuICAgICAgICB7ICRtYXRjaDogeyBcImxpYnJhcnkuaXRlbS50eXBlXCI6IFwidHJhY2tcIiB9IH0sXG4gICAgICAgIHtcbiAgICAgICAgICAvKiAgJGdyb3VwOiB7XG4gICAgICAgICAgICAgIF9pZDogJyRsaWJyYXJ5Lml0ZW0uYWxidW0ubmFtZScsXG4gICAgICAgICAgICAgIG5hbWU6IHsgJGZpcnN0OiBcIiRsaWJyYXJ5Lml0ZW0uYWxidW0ubmFtZVwiIH0sXG4gICAgICAgICAgICAgIGRhdGE6IHsgJHB1c2g6IFwiJGxpYnJhcnkuaXRlbVwiIH0sXG4gICAgICAgICAgICAgIGFkZGVkX2F0OiB7ICRsYXN0OiBcIiRsaWJyYXJ5LmFkZGVkX2F0XCIgfSxcbiAgICAgICAgICAgICAgYWxidW06IHsgJGZpcnN0OiBcIiRsaWJyYXJ5Lml0ZW0uYWxidW1cIiB9LFxuICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICovXG4gICAgICAgICAgJGdyb3VwOiB7XG4gICAgICAgICAgICBfaWQ6IHtcbiAgICAgICAgICAgICAgaWQ6ICckbGlicmFyeS5pdGVtLmFsYnVtLl9pZCcsXG4gICAgICAgICAgICAgIG5hbWU6IFwiJGxpYnJhcnkuaXRlbS5hbGJ1bS5uYW1lXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkYXRhOiB7ICRwdXNoOiBcIiRsaWJyYXJ5Lml0ZW1cIiB9LFxuICAgICAgICAgICAgYWRkZWRfYXQ6IHsgJGxhc3Q6IFwiJGxpYnJhcnkuYWRkZWRfYXRcIiB9LFxuICAgICAgICAgICAgYWxidW06IHsgJGZpcnN0OiBcIiRsaWJyYXJ5Lml0ZW0uYWxidW1cIiB9LFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgeyAkcHJvamVjdDogeyBkYXRhOiB0cnVlLCBfaWQ6IDAsIGFkZGVkX2F0OiAxLCBhbGJ1bTogMSwgbmFtZTogMSB9IH0sXG4gICAgICAgIHsgJHNvcnQ6IHsgYWRkZWRfYXQ6IC0xIH0gfVxuICAgICAgXTtcbiAgICAgIHJldHVybiBhd2FpdCBNZXRlb3IudXNlcnNcbiAgICAgICAgLnJhd0NvbGxlY3Rpb24oKVxuICAgICAgICAuYWdncmVnYXRlKHBpcGVsaW5lKVxuICAgICAgICAudG9BcnJheSgpO1xuICAgIH1cbiAgfSxcblxuICBhc3luYyBnZXRfYWxidW1fdHJhY2tzKGFsYnVtLCBmaWx0ZXIpIHtcbiAgICBjaGVjayhhbGJ1bSwgU3RyaW5nKVxuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgdmFyIHRyYWNrcyA9IFRyYWNrcy5maW5kKFxuICAgICAgeyBhbGJ1bTogYWxidW0gfSxcbiAgICAgIHsgZmllbGRzOiB7IF9pZDogMSB9IH1cbiAgICApLmZldGNoKCk7XG4gICAgdHJhY2tzLmZvckVhY2goKGUsIGkpID0+IHtcblxuICAgICAgcmVzdWx0cy5wdXNoKE1ldGVvci5jYWxsKFwiZ2V0X2Z1bGxfdHJhY2tcIiwgZS5faWQpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSxcblxuICBhc3luYyBsaWJyYXJ5X3NvbmdzKCkge1xuICAgIGlmICh0aGlzLnVzZXJJZCkge1xuICAgICAgdXNlcklkID0gdGhpcy51c2VySWQ7XG4gICAgICB2YXIgcGlwZWxpbmUgPSBbXG4gICAgICAgIHsgJG1hdGNoOiB7IF9pZDogdXNlcklkIH0gfSxcbiAgICAgICAgeyAkdW53aW5kOiBcIiRsaWJyYXJ5XCIgfSxcbiAgICAgICAgeyAkbWF0Y2g6IHsgXCJsaWJyYXJ5Lml0ZW0udHlwZVwiOiBcInRyYWNrXCIgfSB9LFxuICAgICAgICB7XG4gICAgICAgICAgJGdyb3VwOiB7XG4gICAgICAgICAgICBfaWQ6IFwiJGxpYnJhcnkuaXRlbS5faWRcIixcbiAgICAgICAgICAgIHRyYWNrOiB7ICRmaXJzdDogXCIkbGlicmFyeS5pdGVtXCIgfSxcbiAgICAgICAgICAgIGFkZGVkX2F0OiB7ICRsYXN0OiBcIiRsaWJyYXJ5LmFkZGVkX2F0XCIgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgeyAkcHJvamVjdDogeyB0cmFjazogMSwgX2lkOiAwLCBhZGRlZF9hdDogMSB9IH0sXG4gICAgICAgIHsgJHNvcnQ6IHsgXCJ0cmFjay50aXRsZVwiOiAxIH0gfVxuICAgICAgXTtcbiAgICAgIHJldHVybiBhd2FpdCBNZXRlb3IudXNlcnNcbiAgICAgICAgLnJhd0NvbGxlY3Rpb24oKVxuICAgICAgICAuYWdncmVnYXRlKHBpcGVsaW5lKVxuICAgICAgICAudG9BcnJheSgpO1xuICAgIH1cbiAgfSxcbiAgYXN5bmMgbGlicmFyeV9hbGJ1bXMoKSB7XG4gICAgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgICB1c2VySWQgPSB0aGlzLnVzZXJJZDtcbiAgICAgIHZhciBwaXBlbGluZSA9IFtcbiAgICAgICAgeyAkbWF0Y2g6IHsgX2lkOiB1c2VySWQgfSB9LFxuICAgICAgICB7ICR1bndpbmQ6IFwiJGxpYnJhcnlcIiB9LFxuICAgICAgICB7ICRtYXRjaDogeyBcImxpYnJhcnkuaXRlbS50eXBlXCI6IFwidHJhY2tcIiB9IH0sXG4gICAgICAgIHtcbiAgICAgICAgICAkZ3JvdXA6IHtcbiAgICAgICAgICAgIGRhdGE6IHsgJHB1c2g6IFwiJGxpYnJhcnkuaXRlbVwiIH0sXG4gICAgICAgICAgICBfaWQ6IFwiJGxpYnJhcnkuaXRlbS5hbGJ1bS5faWRcIixcbiAgICAgICAgICAgIGFkZGVkX2F0OiB7ICRsYXN0OiBcIiRsaWJyYXJ5LmFkZGVkX2F0XCIgfSxcbiAgICAgICAgICAgIGFsYnVtOiB7ICRmaXJzdDogXCIkbGlicmFyeS5pdGVtLmFsYnVtXCIgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgeyAkcHJvamVjdDogeyBkYXRhOiB0cnVlLCBfaWQ6IDAsIGFkZGVkX2F0OiAxLCBhbGJ1bTogMSB9IH0sXG4gICAgICAgIHsgJHNvcnQ6IHsgXCJhbGJ1bS5hcnRpc3RzLnN0YWdlX25hbWVcIjogMSB9IH1cbiAgICAgIF07XG4gICAgICByZXR1cm4gYXdhaXQgTWV0ZW9yLnVzZXJzXG4gICAgICAgIC5yYXdDb2xsZWN0aW9uKClcbiAgICAgICAgLmFnZ3JlZ2F0ZShwaXBlbGluZSlcbiAgICAgICAgLnRvQXJyYXkoKTtcbiAgICB9XG4gIH0sXG4gIGFzeW5jIHJldHVybl9hbGJ1bShpZCkge1xuICAgIGNoZWNrKGlkLCBTdHJpbmcpO1xuICAgIHZhciBhbGJ1bSA9IEFsYnVtcy5maW5kT25lKFxuICAgICAgeyBfaWQ6IGlkIH0sXG4gICAgICB7XG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIHJlbGVhc2VfZGF0ZTogMSxcbiAgICAgICAgICBhcnRpc3RzOiAxLFxuICAgICAgICAgIG5hbWU6IDEsXG4gICAgICAgICAgYWxidW1fYXJ0OiAxLFxuICAgICAgICAgIGdlbnJlczogMSxcbiAgICAgICAgICBhbGJ1bV90eXBlOiAxLFxuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcbiAgICBpZiAoIWFsYnVtKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgYWxidW0uYXJ0aXN0cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgYWxidW0uYXJ0aXN0cy5tYXAoYXN5bmMgYXJ0aXN0ID0+IHtcbiAgICAgICAgbGV0IG9nID0gQXJ0aXN0cy5maW5kT25lKFxuICAgICAgICAgIHsgX2lkOiBhcnRpc3QgfSxcbiAgICAgICAgICB7IGZpZWxkczogeyBzdGFnZV9uYW1lOiAxIH0gfVxuICAgICAgICApO1xuICAgICAgICBvZy50eXBlID0gXCJhcnRpc3RcIjtcbiAgICAgICAgb2cuaHJlZiA9IG9nLnR5cGUgKyBcIi9cIiArIG9nLl9pZDtcbiAgICAgICAgcmV0dXJuIG9nO1xuICAgICAgfSlcbiAgICApO1xuICAgIGFsYnVtLmltYWdlcyA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB2YXIgd2FudCA9IFs2NCwgMzAwLCA2NDBdO1xuICAgICAgYWxidW0uaW1hZ2VzLnB1c2goe1xuICAgICAgICBoZWlnaHQ6IFN0cmluZyh3YW50W2ldKSxcbiAgICAgICAgd2lkdGg6IFN0cmluZyh3YW50W2ldKSxcbiAgICAgICAgdXJsOiBjbG91ZGluYXJ5LnVybChhbGJ1bS5hbGJ1bV9hcnQuaWQsIHtcbiAgICAgICAgICB3aWR0aDogd2FudFtpXSxcbiAgICAgICAgICBjcm9wOiBcImZpdFwiLFxuICAgICAgICAgIHNlY3VyZTogdHJ1ZVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGFsYnVtLnJlbGVhc2VfeWVhciA9IG1vbWVudChhbGJ1bS5yZWxlYXNlX2RhdGUpLmZvcm1hdChcIllZWVlcIik7XG4gICAgYWxidW0udHlwZSA9IFwiYWxidW1cIjtcbiAgICBhbGJ1bS5pZCA9IGFsYnVtLl9pZFxuXG4gICAgLy8gZGVsZXRlIGFsYnVtLl9pZFxuICAgIGRlbGV0ZSBhbGJ1bS5hbGJ1bV9hcnQ7XG5cbiAgICByZXR1cm4gYWxidW07XG4gIH0sXG4gIGFzeW5jIHJldHVybl9hbGJ1bV9pbmZvKGlkKSB7XG4gICAgY2hlY2soaWQsIFN0cmluZyk7XG4gICAgdmFyIGFsYnVtID0gQWxidW1zLmZpbmRPbmUoXG4gICAgICB7IF9pZDogaWQgfSxcbiAgICAgIHtcbiAgICAgICAgZmllbGRzOiB7XG5cbiAgICAgICAgICBhcnRpc3RzOiAxLFxuICAgICAgICAgIG5hbWU6IDEsXG4gICAgICAgICAgZ2VucmVzOiAxLFxuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuICAgIGlmICghYWxidW0pIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBhbGJ1bS5hcnRpc3RzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICBhbGJ1bS5hcnRpc3RzLm1hcChhc3luYyBhcnRpc3QgPT4ge1xuICAgICAgICBsZXQgb2cgPSBBcnRpc3RzLmZpbmRPbmUoXG4gICAgICAgICAgeyBfaWQ6IGFydGlzdCB9LFxuICAgICAgICAgIHsgZmllbGRzOiB7IHN0YWdlX25hbWU6IDEgfSB9XG4gICAgICAgICk7XG4gICAgICAgIG9nLnR5cGUgPSBcImFydGlzdFwiO1xuXG4gICAgICAgIHJldHVybiBvZztcbiAgICAgIH0pXG4gICAgKTtcbiAgICBhbGJ1bS50eXBlID0gXCJhbGJ1bVwiO1xuICAgIGFsYnVtLmlkID0gYWxidW0uX2lkXG5cbiAgICByZXR1cm4gYWxidW1cbiAgfSxcbiAgZ2V0X2FsYnVtcyhpZHMpIHtcbiAgICBjaGVjayhpZHMsIEFycmF5KTtcblxuICAgIHZhciBhbGJ1bXMgPSBBbGJ1bXMuZmluZChcbiAgICAgIHsgX2lkOiB7ICRpbjogaWRzIH0gfSxcbiAgICAgIHtcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgcmVsZWFzZV9kYXRlOiAxLFxuICAgICAgICAgIGFydGlzdHM6IDEsXG4gICAgICAgICAgbmFtZTogMSxcbiAgICAgICAgICBhbGJ1bV9hcnQ6IDEsXG4gICAgICAgICAgZ2VucmVzOiAxLFxuICAgICAgICAgIGFsYnVtX3R5cGU6IDEsXG4gICAgICAgICAgZGVzY3JpcHRpb246IDFcbiAgICAgICAgfVxuICAgICAgfVxuICAgICkuZmV0Y2goKTtcbiAgICBpZiAoYWxidW1zLmxlbmd0aCkge1xuXG4gICAgICBhbGJ1bXMuZm9yRWFjaCgoYWxidW0sIGluZGV4KSA9PiB7XG4gICAgICAgIGFsYnVtLmFydGlzdHMgPSBhbGJ1bS5hcnRpc3RzLm1hcChhcnRpc3QgPT4ge1xuXG4gICAgICAgICAgbGV0IG9nID0gQXJ0aXN0cy5maW5kT25lKFxuICAgICAgICAgICAgeyBfaWQ6IGFydGlzdCB9LFxuICAgICAgICAgICAgeyBmaWVsZHM6IHsgc3RhZ2VfbmFtZTogMSB9IH1cbiAgICAgICAgICApO1xuICAgICAgICAgIG9nLnR5cGUgPSBcImFydGlzdFwiO1xuICAgICAgICAgIG9nLmhyZWYgPSBvZy50eXBlICsgXCIvXCIgKyBvZy5faWQ7XG4gICAgICAgICAgcmV0dXJuIG9nO1xuICAgICAgICB9KTtcblxuICAgICAgICBhbGJ1bS5pbWFnZXMgPSBmb3JtYXRJbWFnZShhbGJ1bS5hbGJ1bV9hcnQuaWQsIFs2NCwgMzAwLCA2NDBdKTtcbiAgICAgICAgYWxidW0ucmVsZWFzZV95ZWFyID0gbW9tZW50KGFsYnVtLnJlbGVhc2VfZGF0ZSkuZm9ybWF0KFwiWVlZWVwiKTtcbiAgICAgICAgYWxidW0udHlwZSA9IFwiYWxidW1cIjtcbiAgICAgICAgYWxidW0uaWQgPSBhbGJ1bS5faWQ7XG4gICAgICAgIGRlbGV0ZSBhbGJ1bS5hbGJ1bV9hcnQ7XG4gICAgICB9KTtcblxuICAgIH1cbiAgICByZXR1cm4gYWxidW1zO1xuXG4gIH0sXG4gIHJldHVybl9pbWFnZXMoaWQpIHtcbiAgICBsZXQgaW1hZ2VzID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHZhciB3YW50ID0gWzY0LCAzMDAsIDY0MF07XG4gICAgICBpbWFnZXMucHVzaCh7XG4gICAgICAgIGhlaWdodDogU3RyaW5nKHdhbnRbaV0pLFxuICAgICAgICB3aWR0aDogU3RyaW5nKHdhbnRbaV0pLFxuICAgICAgICB1cmw6IGNsb3VkaW5hcnkudXJsKGlkLCB7IHdpZHRoOiB3YW50W2ldLCBjcm9wOiBcImZpdFwiLCBzZWN1cmU6IHRydWUgfSlcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gaW1hZ2VzO1xuICB9LFxuICBhc3luYyByZXR1cm5fYWxidW1fZnVsbChpZCkge1xuICAgIGxldCBhbGJ1bSA9IEFsYnVtcy5maW5kT25lKFxuICAgICAgeyBfaWQ6IGlkIH0sXG4gICAgICB7XG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIHJlbGVhc2VfZGF0ZTogMSxcbiAgICAgICAgICBhcnRpc3RzOiAxLFxuICAgICAgICAgIG5hbWU6IDEsXG4gICAgICAgICAgYWxidW1fYXJ0OiAxLFxuICAgICAgICAgIGdlbnJlczogMSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogMSxcbiAgICAgICAgICBhbGJ1bV90eXBlOiAxXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuICAgIGlmICghYWxidW0pIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXCJuby1hbGJ1bVwiKTtcbiAgICB9XG4gICAgYWxidW0uYXJ0aXN0cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgYWxidW0uYXJ0aXN0cy5tYXAoYXN5bmMgYXJ0aXN0ID0+IHtcbiAgICAgICAgbGV0IG9nID0gQXJ0aXN0cy5maW5kT25lKFxuICAgICAgICAgIHsgX2lkOiBhcnRpc3QgfSxcbiAgICAgICAgICB7IGZpZWxkczogeyBzdGFnZV9uYW1lOiAxIH0gfVxuICAgICAgICApO1xuICAgICAgICBvZy50eXBlID0gXCJhcnRpc3RcIjtcbiAgICAgICAgb2cuaHJlZiA9IG9nLnR5cGUgKyBcIi9cIiArIG9nLl9pZDtcbiAgICAgICAgcmV0dXJuIG9nO1xuICAgICAgfSlcbiAgICApO1xuICAgIGFsYnVtLnRyYWNrcyA9IFRyYWNrcy5maW5kKFxuICAgICAgeyBhbGJ1bTogYWxidW0uX2lkIH0sXG4gICAgICB7XG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIGFsYnVtOiAxLFxuICAgICAgICAgIGV4cGxpY2l0OiAxLFxuICAgICAgICAgIGZlYXR1cmluZ19hcnRpc3RzOiAxLFxuICAgICAgICAgIGdlbnJlczogMSxcbiAgICAgICAgICB0aXRsZTogMSxcbiAgICAgICAgICB0cmFja19udW1iZXI6IDEsXG4gICAgICAgICAgdHlwZTogMSxcbiAgICAgICAgICBmb3JtYXRzOiAxLFxuICAgICAgICAgIGR1cmF0aW9uOiAxXG4gICAgICAgIH0sXG4gICAgICAgIHNvcnQ6IHsgdHJhY2tfbnVtYmVyOiAxIH1cbiAgICAgIH1cbiAgICApLmZldGNoKCk7XG4gICAgYWxidW0udHJhY2tzLmZvckVhY2goKGVsLCBpbmRleCkgPT4ge1xuICAgICAgaWYgKGVsLmZlYXR1cmluZ19hcnRpc3RzLmxlbmd0aClcbiAgICAgICAgZWwuZmVhdHVyaW5nX2FydGlzdHMuZm9yRWFjaCgoZSwgaSkgPT4ge1xuICAgICAgICAgIGxldCB2ID0gTWV0ZW9yLmNhbGwoXCJhcnRpc3Rfc2hvcnRfaW5mb1wiLCBlKTtcbiAgICAgICAgICBlbC5mZWF0dXJpbmdfYXJ0aXN0c1tpXSA9IHY7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGFsYnVtLmltYWdlcyA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB2YXIgd2FudCA9IFs2NCwgMzAwLCA2NDBdO1xuICAgICAgYWxidW0uaW1hZ2VzLnB1c2goe1xuICAgICAgICBoZWlnaHQ6IFN0cmluZyh3YW50W2ldKSxcbiAgICAgICAgd2lkdGg6IFN0cmluZyh3YW50W2ldKSxcbiAgICAgICAgdXJsOiBjbG91ZGluYXJ5LnVybChhbGJ1bS5hbGJ1bV9hcnQuaWQsIHtcbiAgICAgICAgICB3aWR0aDogd2FudFtpXSxcbiAgICAgICAgICBjcm9wOiBcImZpdFwiLFxuICAgICAgICAgIHNlY3VyZTogdHJ1ZVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgfVxuICAgIGFsYnVtLnR5cGUgPSBcImFsYnVtXCI7XG4gICAgYWxidW0ucmVsZWFzZV95ZWFyID0gbW9tZW50KGFsYnVtLnJlbGVhc2VfZGF0ZSkuZm9ybWF0KFwiWVlZWVwiKTtcbiAgICBhbGJ1bS5pZCA9IGFsYnVtLl9pZDtcbiAgICBhbGJ1bS5ocmVmID0gYWxidW0udHlwZSArIFwiL1wiICsgYWxidW0uaWQ7XG4gICAgZGVsZXRlIGFsYnVtLmFsYnVtX2FydDtcbiAgICByZXR1cm4gYWxidW07XG4gIH0sXG4gIGFzeW5jIGFkZF95b3VfdG9fbGlicmFyeSh0cmEpIHtcbiAgICBjaGVjayh0cmEsIHtcbiAgICAgIGlkOiBTdHJpbmcsXG4gICAgICBpbWd1cmw6IFN0cmluZyxcbiAgICAgIHRpdGxlOiBOb25FbXB0eVN0cmluZ1xuICAgIH0pO1xuICAgIHZhciB1cmwgPSBcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9XCIgKyB0cmEuaWQ7XG4gICAgdmFyIHVzZXJJZCA9IHRoaXMudXNlcklkO1xuICAgIHZhciBub3RleGlzdHMgPSBNZXRlb3IudXNlcnMuZmluZCh7XG4gICAgICBfaWQ6IHVzZXJJZCxcbiAgICAgIFwibGlicmFyeS5pdGVtLl9pZFwiOiB7ICRuZTogdHJhLmlkIH1cbiAgICB9KTtcbiAgICBpZiAoIW5vdGV4aXN0cykge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcihcInRyYWNrLWV4aXN0c1wiKTtcbiAgICB9XG4gICAgY2hlY2sodXJsLCBTdHJpbmcpO1xuICAgIHZhciBzdHJlYW0gPSBjbG91ZGluYXJ5LnYyLnVwbG9hZGVyLnVwbG9hZF9zdHJlYW0oXG4gICAgICB7IHJlc291cmNlX3R5cGU6IFwiYXV0b1wiIH0sXG4gICAgICBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0KSB7XG4gICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICB2YXIgaXRlbSA9IHtcbiAgICAgICAgICAgIF9pZDogdHJhLmlkLFxuICAgICAgICAgICAgYWRkZWRfYXQ6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICBpdGVtOiB7XG4gICAgICAgICAgICAgIC8vICAgICAgIDpyZXN1bHQuc2VjdXJlX3VybCxcbiAgICAgICAgICAgICAgYWxidW06IHtcbiAgICAgICAgICAgICAgICBfaWQ6IFwieW91dHViZVwiLFxuICAgICAgICAgICAgICAgIG5hbWU6IFwiWW91dHViZVwiLFxuICAgICAgICAgICAgICAgIGltYWdlczogW3sgdXJsOiB0cmEuaW1ndXJsIH0sIHsgdXJsOiB0cmEuaW1ndXJsIH1dLFxuICAgICAgICAgICAgICAgIGFydGlzdHM6IFt7IGlkOiBcInlvdXR1YmVcIiwgc3RhZ2VfbmFtZTogXCJZb3V0dWJlXCIgfV1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgX2lkOiB0cmEuaWQsXG4gICAgICAgICAgICAgIHRpdGxlOiB0cmEudGl0bGUsXG4gICAgICAgICAgICAgIHR5cGU6IFwidHJhY2tcIixcbiAgICAgICAgICAgICAgZHVyYXRpb246IHJlc3VsdC5kdXJhdGlvbixcbiAgICAgICAgICAgICAgZmVhdHVyaW5nX2FydGlzdHM6IFtdXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICBpdGVtLml0ZW1bcmVzdWx0LmZvcm1hdF0gPSByZXN1bHQuc2VjdXJlX3VybDtcblxuICAgICAgICAgIFlvdXR1YmUuaW5zZXJ0KGl0ZW0pO1xuICAgICAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoXG4gICAgICAgICAgICB7IF9pZDogdXNlcklkLCBcImxpYnJhcnkuaXRlbS5faWRcIjogeyAkbmU6IGl0ZW0uaXRlbS5faWQgfSB9LFxuICAgICAgICAgICAgeyAkcHVzaDogeyBsaWJyYXJ5OiBpdGVtIH0gfVxuICAgICAgICAgICk7XG5cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICAgIHZhciB5b3V0ID0gWW91dHViZS5maW5kT25lKHRyYS5pZCk7XG4gICAgaWYgKHlvdXQpIHtcbiAgICAgIC8vJG5lIG5vdCBuZWVkZWQgLCBqdXN0IGluIGNhc2UuXG5cbiAgICAgIHlvdXQuYWRkZWRfYXQgPSBuZXcgRGF0ZSgpO1xuICAgICAgTWV0ZW9yLnVzZXJzLnVwZGF0ZShcbiAgICAgICAgeyBfaWQ6IHVzZXJJZCwgXCJsaWJyYXJ5Lml0ZW0uX2lkXCI6IHsgJG5lOiB5b3V0IH0gfSxcbiAgICAgICAgeyAkcHVzaDogeyBsaWJyYXJ5OiB5b3V0IH0gfVxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHl0ZGwodXJsLCB7XG4gICAgICAgIGZpbHRlcjogXCJhdWRpb29ubHlcIlxuICAgICAgfSkucGlwZShzdHJlYW0pO1xuICAgIH1cbiAgfSxcbiAgZ2V0X2FydGlzdChpZCkge1xuICAgIGNoZWNrKGlkLCBTdHJpbmcpO1xuICAgIGxldCBhcnQgPSBBcnRpc3RzLmZpbmRPbmUoaWQpO1xuXG4gICAgYXJ0LmhyZWYgPSBcImFydGlzdFwiICsgXCIvXCIgKyBhcnQuX2lkO1xuICAgIGFydC5wcm9maWxlLmdlbnJlcy5mb3JFYWNoKChlLCBpKSA9PiB7XG4gICAgICBhcnQucHJvZmlsZS5nZW5yZXNbaV0gPSBHZW5yZXMuZmluZE9uZShlKSA/IEdlbnJlcy5maW5kT25lKGUpLm5hbWUgOiBcIlVua25vd24gR2VucmVcIjtcbiAgICB9KTtcbiAgICByZXR1cm4gYXJ0O1xuICB9LFxuICBnZXRfYXJ0aXN0cyhhcnRpc3RzKSB7XG4gICAgY2hlY2soYXJ0aXN0cywgQXJyYXkpO1xuICAgIGxldCBhcnQgPSBBcnRpc3RzLmZpbmQoXG4gICAgICB7IF9pZDogeyAkaW46IGFydGlzdHMgfSB9LFxuXG4gICAgKS5mZXRjaCgpO1xuXG4gICAgcmV0dXJuIGFydDtcbiAgfSxcbiAgYXN5bmMgZ2V0X2FydGlzdF9scihhcnRpc3QpIHtcbiAgICBjaGVjayhhcnRpc3QsIFN0cmluZyk7XG4gICAgbGV0IGFsYiA9IEFsYnVtcy5maW5kT25lKFxuICAgICAgeyBhcnRpc3RzOiB7ICRpbjogW2FydGlzdF0gfSB9LFxuICAgICAgeyBzb3J0OiB7IHJlbGVhc2VfZGF0ZTogLTEgfSwgZmllbGRzOiB7IF9pZDogMSB9IH1cbiAgICApO1xuICAgIGlmIChhbGIpIHtcbiAgICAgIHJldHVybiBNZXRlb3IuY2FsbChcInJldHVybl9hbGJ1bVwiLCBhbGIuX2lkKTtcbiAgICB9XG4gIH0sXG4gIGFzeW5jIGdldF9hcnRpc3RfdG9wc29uZ3MoYXJ0aXN0LCBsaW0sIHNlYXJjaCkge1xuICAgIGNoZWNrKGFydGlzdCwgU3RyaW5nKTtcbiAgICBsZXQgYWxidW1zID0gQWxidW1zLmZpbmQoXG4gICAgICB7IGFydGlzdHM6IHsgJGluOiBbYXJ0aXN0XSB9IH0sXG4gICAgICB7IGZpZWxkczogeyBfaWQ6IDEgfSB9XG4gICAgKS5mZXRjaCgpO1xuICAgIGxldCBhbGJ1bVRyYWNrcyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgYWxidW1zLm1hcChhc3luYyBhbGJ1bSA9PiB7XG4gICAgICAgIGxldCB0ciA9IFRyYWNrcy5maW5kKFxuICAgICAgICAgIHsgYWxidW06IGFsYnVtLl9pZCB9LFxuICAgICAgICAgIHsgZmllbGRzOiB7IF9pZDogMSB9LCBzb3J0OiB7IHBsYXlzOiAtMSB9LCBsaW1pdDogbGltIHx8IDUwIH1cbiAgICAgICAgKS5mZXRjaCgpO1xuICAgICAgICByZXR1cm4gdHI7XG4gICAgICB9KVxuICAgICk7XG4gICAgdmFyIGFydGlzdFRyYWNrcyA9IFtdLmNvbmNhdC5hcHBseShbXSwgYWxidW1UcmFja3MpO1xuICAgIHZhciBhcnIyID0gVHJhY2tzLmZpbmQoXG4gICAgICB7IGZlYXR1cmluZ19hcnRpc3RzOiB7ICRpbjogW2FydGlzdF0gfSB9LFxuICAgICAgeyBmaWVsZHM6IHsgX2lkOiAxIH0sIHNvcnQ6IHsgcGxheXM6IC0xIH0sIGxpbWl0OiBsaW0gfHwgNTAgfVxuICAgICkuZmV0Y2goKTtcbiAgICB2YXIgdG9SZSA9IGFydGlzdFRyYWNrcy5jb25jYXQoYXJyMikuc29ydCgoYSwgYikgPT4ge1xuICAgICAgaWYgKGEucGxheXMgJiYgYi5wbGF5cykge1xuICAgICAgICByZXR1cm4gYi5wbGF5cyAtIGEucGxheXM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gLTU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdmFyIG1hcG8gPSB0b1JlLm1hcCh4ID0+IE1ldGVvci5jYWxsKFwiZ2V0X2Z1bGxfdHJhY2tcIiwgeC5faWQpKTtcbiAgICBpZiAoc2VhcmNoKSB7XG4gICAgICByZXR1cm4gbWFwbztcbiAgICB9XG4gICAgdmFyIHBsYXlsaXN0ID0ge1xuICAgICAgZGF0YTogbWFwbyxcbiAgICAgIG5hbWU6IFwiVG9wIHNvbmdzXCIsXG4gICAgICBfaWQ6IGFydGlzdFxuICAgIH07XG4gICAgLy9JZiBub3QgU2hvdyBhbGwgcGFnZVxuICAgIGlmICghbGltKSB7XG4gICAgICBsZXQgbmFtZSA9IE1ldGVvci5jYWxsKFwiYXJ0aXN0X3Nob3J0X2luZm9cIiwgYXJ0aXN0KTtcbiAgICAgIG5hbWUuc3RhZ2VfbmFtZTtcbiAgICAgIHBsYXlsaXN0Lm5hbWUgKz0gXCIgLSBcIiArIG5hbWUuc3RhZ2VfbmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIHBsYXlsaXN0O1xuICB9LFxuICBhc3luYyBnZXRfYXJ0aXN0X2FsYnVtcyhhcnRpc3QpIHtcbiAgICBjaGVjayhhcnRpc3QsIFN0cmluZyk7XG4gICAgbGV0IGFsYnMgPSBBbGJ1bXMuZmluZChcbiAgICAgIHsgYXJ0aXN0czogeyAkaW46IFthcnRpc3RdIH0gfSxcbiAgICAgIHsgZmllbGRzOiB7IF9pZDogMSB9LCBzb3J0OiB7IHJlbGVhc2VfZGF0ZTogLTEgfSB9XG4gICAgKS5mZXRjaCgpO1xuICAgIHZhciBhbGJ1bXMgPSBhbGJzLm1hcCh4ID0+IE1ldGVvci5jYWxsKFwicmV0dXJuX2FsYnVtXCIsIHguX2lkKSk7XG4gICAgcmV0dXJuIGFsYnVtcztcbiAgfSxcbiAgYXN5bmMgZ2V0X2FydGlzdF9zbShpZCwgZ2VucmUpIHtcbiAgICBjaGVjayhpZCwgU3RyaW5nKTtcbiAgICBjaGVjayhpZCwgU3RyaW5nKTtcbiAgICB2YXIgdG9SZXR1cm4gPSBbXTtcbiAgICBsZXQgYXJ0aXN0cyA9IEFydGlzdHMuZmluZChcbiAgICAgIHsgX2lkOiB7ICRuZTogaWQgfSwgJ3Byb2ZpbGUuZ2VucmVzJzogeyAkYWxsOiBnZW5yZSB9IH0sXG4gICAgICB7XG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIF9pZDogMSxcbiAgICAgICAgICBpbWFnZTogMSxcbiAgICAgICAgICBjb3ZlcjogMSxcbiAgICAgICAgICB0eXBlOiAxLFxuICAgICAgICAgIGdlbnJlczogMSxcbiAgICAgICAgICBiaW86IDEsXG4gICAgICAgICAgc3RhZ2VfbmFtZTogMSxcbiAgICAgICAgICBub3RlczogMVxuICAgICAgICB9LFxuICAgICAgICBsaW1pdDogMTBcbiAgICAgIH1cbiAgICApLmZldGNoKCk7XG4gICAgYXJ0aXN0cy5mb3JFYWNoKChhcnQsIGluZCkgPT4ge1xuICAgICAgYXJ0LmhyZWYgPSBcImFydGlzdFwiICsgXCIvXCIgKyBhcnQuX2lkO1xuICAgICAgYXJ0LmlkID0gYXJ0Ll9pZDtcbiAgICAgIGFydC50eXBlID0gXCJhcnRpc3RcIjtcbiAgICAgIGFydC5nZW5yZXMuZm9yRWFjaCgoZSwgaSkgPT4ge1xuICAgICAgICBhcnQuZ2VucmVzW2ldID0gR2VucmVzLmZpbmRPbmUoZSkubmFtZTtcbiAgICAgIH0pO1xuICAgICAgdG9SZXR1cm4ucHVzaChhcnQpO1xuICAgIH0pO1xuICAgIHJldHVybiB0b1JldHVybjtcbiAgfSxcbiAgcmVtb3ZlX2Zyb21fbGlicmFyeShpZCkge1xuICAgIGNoZWNrKGlkLCBTdHJpbmcpO1xuXG4gICAgaWYgKCF0aGlzLnVzZXJJZCkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci51c2VyKFwibm91c2VyXCIpO1xuICAgIH1cbiAgICBNZXRlb3IudXNlcnMudXBkYXRlKFxuICAgICAgeyBfaWQ6IHRoaXMudXNlcklkIH0sXG4gICAgICB7ICRwdWxsOiB7IGxpYnJhcnk6IHsgXCJpdGVtLl9pZFwiOiBpZCB9IH0gfVxuICAgICk7XG5cblxuICAgIE1ldGVvci51c2Vycy51cGRhdGUoeyBfaWQ6IHRoaXMudXNlcklkIH0sIHtcbiAgICAgICRwdWxsOiB7XG4gICAgICAgICdyZWNlbnRseV9wbGF5ZWQnOiB7ICdpdGVtLl9pZCc6IGlkIH1cbiAgICAgIH1cbiAgICB9KVxuXG5cbiAgfSxcbiAgbGlrZV9pdGVtKGl0ZW0pIHtcbiAgICAvL05lZWQgVXBkYXRlXG4gICAgY2hlY2soaXRlbSwgU3RyaW5nKTtcbiAgICBpZiAodGhpcy51c2VySWQpIHtcbiAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoeyBfaWQ6IHRoaXMudXNlcklkIH0sIHsgJHB1c2g6IHsgbGlrZXM6IGl0ZW0gfSB9KTtcbiAgICB9XG4gIH0sXG4gIGRpc2xpa2VfaXRlbShpdGVtKSB7XG4gICAgY2hlY2soaXRlbSwgU3RyaW5nKTtcbiAgICBpZiAodGhpcy51c2VySWQpIHtcbiAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoeyBfaWQ6IHRoaXMudXNlcklkIH0sIHsgJHB1bGw6IHsgbGlrZXM6IGl0ZW0gfSB9KTtcbiAgICB9XG4gIH0sXG4gIGFkZF9hcnRpc3QoYXJ0aXN0KSB7XG4gICAgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgICAvLyBsZXQgYXJ0ID0gTWV0ZW9yLmNhbGwoXCJhcnRpc3Rfc2hvcnRfaW5mb1wiLCBhcnRpc3QpO1xuICAgICAgLy8gYXJ0LmFydGlzdCA9IGFydGlzdDtcblxuICAgICAgLy9QdXJwb3NlbHkgZGlkJ3QgY2hlY2sgaWYgdGhlIHVzZXIgaXMgYWxyZWFkeSBmb2xsb3dpbmcgYmVjYXVzZSBzaG91bGQnbnQgaGFwcGVuXG4gICAgICAvL09ubHkgaWYgc29tZSBjYWxsZWQgdGhlIGNvZGUgbWFudWFsbHkgXG4gICAgICBBcnRpc3RzLnVwZGF0ZSh7IF9pZDogYXJ0aXN0IH0sIHsgJHB1c2g6IHsgZm9sbG93ZXJzOiB0aGlzLnVzZXJJZCB9IH0pXG4gICAgICBNZXRlb3IudXNlcnMudXBkYXRlKFxuICAgICAgICB7XG4gICAgICAgICAgX2lkOiB0aGlzLnVzZXJJZCxcbiAgICAgICAgICBcImFydGlzdHNcIjogeyAkbmluOiBbYXJ0aXN0XSB9XG4gICAgICAgIH0sIHsgJHB1c2g6IHsgYXJ0aXN0czogYXJ0aXN0IH0gfVxuICAgICAgKTtcbiAgICB9XG5cbiAgfSwgcmVtb3ZlX2FydGlzdChhcnRpc3QpIHtcbiAgICBjaGVjayhhcnRpc3QsIFN0cmluZylcbiAgICBpZiAodGhpcy51c2VySWQpIHtcbiAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoXG4gICAgICAgIHtcbiAgICAgICAgICBfaWQ6IHRoaXMudXNlcklkLFxuXG4gICAgICAgIH0sIHsgJHB1bGw6IHsgYXJ0aXN0czogYXJ0aXN0IH0gfVxuICAgICAgKTtcbiAgICB9XG4gICAgQXJ0aXN0cy51cGRhdGUoeyBfaWQ6IGFydGlzdCB9LCB7ICRwdWxsOiB7IGZvbGxvd2VyczogdGhpcy51c2VySWQgfSB9KVxuXG5cblxuICB9LFxuICBhc3luYyBtb3JlX2J5X2FydGlzdHMoYXJ0aXN0cywgYWxidW0pIHtcbiAgICBjaGVjayhhcnRpc3RzLCBbTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHsgX2lkOiBTdHJpbmcgfSldKTtcbiAgICBjaGVjayhhbGJ1bSwgU3RyaW5nKTtcbiAgICB2YXIgYWxidW1zID0gW107XG5cbiAgICBhcnQgPSBhcnRpc3RzLm1hcChlbCA9PiB7XG4gICAgICByZXR1cm4gZWwuX2lkO1xuICAgIH0pO1xuICAgIGxldCBhbGJzID0gQWxidW1zLmZpbmQoXG4gICAgICB7IF9pZDogeyAkbmU6IGFsYnVtIH0sIGFydGlzdHM6IHsgJGluOiBhcnQgfSB9LFxuICAgICAgeyBmaWVsZHM6IHsgX2lkOiAxIH0sIHNvcnQ6IHsgcmVsZWFzZV9kYXRlOiAtMSB9IH1cbiAgICApLmZldGNoKCk7XG5cbiAgICBhbGJzLmZvckVhY2goZWwgPT4ge1xuICAgICAgYWxidW1zLnB1c2goTWV0ZW9yLmNhbGwoXCJyZXR1cm5fYWxidW1cIiwgZWwuX2lkKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFsYnVtcztcbiAgfSxcbiAgYWRkX3VzZXJfdHJhY2sodHJhY2spIHtcbiAgICAvL1RvIExpYnJhcnlcblxuICAgIGNoZWNrKFxuICAgICAgdHJhY2ssXG4gICAgICBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuICAgICAgICBvcmlnaW5hbDogU3RyaW5nLFxuICAgICAgICB0aXRsZTogU3RyaW5nLFxuICAgICAgICBhcnRpc3Q6IFN0cmluZyxcbiAgICAgICAgZHVyYXRpb246IE1hdGNoLkludGVnZXJcbiAgICAgIH0pXG4gICAgKTtcbiAgICBpZiAodGhpcy51c2VySWQpIHtcbiAgICAgIHZhciBvYmogPSB0cmFjaztcbiAgICAgIG9iai5mb3JtYXRzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgdXJsOiB0cmFjay5vcmlnaW5hbCxcbiAgICAgICAgICBmb3JtYXQ6IHRyYWNrLmZvcm1hdFxuICAgICAgICB9XG4gICAgICBdO1xuXG4gICAgICBvYmouYWxidW0gPSB7XG4gICAgICAgIG5hbWU6IG9iai5hbGJ1bSB8fCBcIlVua25vd24gQWxidW1cIixcbiAgICAgICAgaW1hZ2VzOiBvYmouaW1hZ2VfdXJsID8gZm9ybWF0SW1hZ2Uob2JqLmltYWdlX3VybCwgWzY0LCAzMDAsIDY0MF0pIDogW10sXG4gICAgICAgIHR5cGU6IFwiYWxidW1cIixcbiAgICAgICAgX2lkOiBvYmouYWxidW0ubGVuZ3RoID8gb2JqLmFsYnVtLnJlcGxhY2UoL1xcVy9nLCAnJykudG9Mb3dlckNhc2UoKSA6ICd1bmtub3duJyxcbiAgICAgICAgaWQ6IG9iai5hbGJ1bS5sZW5ndGggPyBvYmouYWxidW0ucmVwbGFjZSgvXFxXL2csICcnKS50b0xvd2VyQ2FzZSgpIDogJ3Vua25vd24nLFxuICAgICAgICBhcnRpc3RzOiBbeyBzdGFnZV9uYW1lOiBvYmouYXJ0aXN0IHx8IFwiVW5rbm93biBBcnRpc3RcIiwgX2lkOiBvYmouYXJ0aXN0ID8gb2JqLmFydGlzdC5yZXBsYWNlKC9cXFcvZywgJycpLnRvTG93ZXJDYXNlKCkgOiAndW5rbm93bicgfV0sXG4gICAgICAgIHVzZXJfYWxidW06IHRydWVcbiAgICAgIH07XG5cblxuICAgICAgb2JqLmZlYXR1cmluZ19hcnRpc3RzID0gW11cbiAgICAgIGRlbGV0ZSBvYmoub3JpZ2luYWw7XG5cbiAgICAgIG9iai51c2VyX3RyYWNrID0gdHJ1ZTtcbiAgICAgIGRlbGV0ZSBvYmouaW1hZ2VfdXJsO1xuICAgICAgb2JqLnR5cGUgPSBcInRyYWNrXCI7XG4gICAgICBvYmouX2lkID0gUmFuZG9tLmlkKDEwKVxuICAgICAgdmFyIGxpYkl0ZW0gPSB7XG4gICAgICAgIGl0ZW06IG9iaixcbiAgICAgICAgYWRkZWRfYXQ6IG5ldyBEYXRlKClcbiAgICAgIH1cbiAgICAgIHRyeSB7XG5cbiAgICAgICAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7IF9pZDogdGhpcy51c2VySWQgfSwge1xuICAgICAgICAgICRwdXNoOiB7XG4gICAgICAgICAgICBsaWJyYXJ5OiB7XG4gICAgICAgICAgICAgICRlYWNoOiBbbGliSXRlbV1cbiAgICAgICAgICAgICAgLCAkcG9zaXRpb246IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIG9iai51cGxvYWRlZF9ieSA9IHRoaXMudXNlcklkO1xuICAgICAgICBvYmoudXBsb2FkZWRfYXQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBVc2VyVHJhY2tzLmluc2VydChvYmopXG5cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICB9XG5cbiAgICB9XG4gIH0sIGFkZF90b191c2VyX2xpYnJhcnkoaXRlbSkge1xuXG4gIH1cbn0pO1xuLypcblRyYWNrcy5pbnNlcnQoeyBcIl9pZFwiOiBSYW5kb20uaWQoKSwgXCJleHBsaWNpdFwiOiBmYWxzZSwgXCJmZWF0dXJpbmdfYXJ0aXN0c1wiOiBbXSwgXCJnZW5yZXNcIjogW1wiXCJdLCBcInRpdGxlXCI6IFwiVHJhcCBUcmFwIFRyYXBcIiwgXCJyZWNvcmRpbmdfeWVhclwiOiAyMDE5LCBcInZlcnNpb25cIjogXCJvcmlnaW5hbFwiLCBcImFsYnVtXCI6IFwiRmROQXNRanJIWG1FQUdEdkxcIiwgXCJsYW5ndWFnZV9jb2RlXCI6IFwiZW5cIiwgXCJhZGRlZF9hdFwiOiBcIjIwMjAtMDEtMDdUMTc6NTM6MzIuMTk4WlwiLCBcInBsYXlzXCI6IDAsIFwiZm9ybWF0c1wiOiBbeyBcImZvcm1hdFwiOiBcIndhdlwiLCBcInVybFwiOiBcImh0dHBzOi8vcmVzLmNsb3VkaW5hcnkuY29tL25laWdoYm9yaG9vZC92aWRlby91cGxvYWQvdjE1Nzg0MTM1MzgvcmVsZWFzZXMvSk1BOFBieEJySS53YXZcIiwgXCJpZFwiOiBcInJlbGVhc2VzL0pNQThQYnhCcklcIiB9XSwgXCJkdXJhdGlvblwiOiAxOTMuODI4NTcxIH0sIGZ1bmN0aW9uIChlcnIsIGluZm8pIHtcblxufSlcbiovIiwiZXhwb3J0IGNvbnN0IEFsYnVtcyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKFwiYWxidW1zXCIpO1xuZXhwb3J0IGNvbnN0IE1hcmtldHMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbihcIm1hcmtldHNcIik7XG5leHBvcnQgY29uc3QgVHJhY2tzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oXCJ0cmFja3NcIik7XG5leHBvcnQgY29uc3QgR2VucmVzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oXCJnZW5yZXNcIik7XG5leHBvcnQgY29uc3QgRGlzY292ZXIgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbihcImRpc2NvdmVyXCIpO1xuZXhwb3J0IGNvbnN0IFBsYXlsaXN0cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKFwicGxheWxpc3RzXCIpO1xuZXhwb3J0IGNvbnN0IEFjdGl2aXRpZXMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbihcImFjdGl2aXRpZXNcIik7XG5leHBvcnQgY29uc3QgQXJ0aXN0cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKFwiYXJ0aXN0c1wiKTtcbmV4cG9ydCBjb25zdCBZb3V0dWJlID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oXCJ5b3V0dWJlXCIpO1xuZXhwb3J0IGNvbnN0IFVzZXJUcmFja3MgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbihcInVzZXJ0cmFja3NcIik7XG5leHBvcnQgY29uc3QgUmVsZWFzZXMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbihcInJlbGVhc2VzXCIpO1xuZXhwb3J0IGNvbnN0IFNwYWNlcyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdzcGFjZXMnKVxuIiwiaW1wb3J0IHtcbiAgVHJhY2tzLFxuICBEaXNjb3ZlcixcbiAgQWxidW1zLFxuICBQbGF5bGlzdHMsXG4gIEdlbnJlcyxcbiAgQXJ0aXN0cyxcbiAgQWN0aXZpdGllcyxcbiAgVXNlclRyYWNrcyxcbiAgUmVsZWFzZXNcbn0gZnJvbSBcIi4vY29sbGVjdGlvbnNcIjtcblxuaW1wb3J0IHsgUmVhY3RpdmVBZ2dyZWdhdGUgfSBmcm9tIFwibWV0ZW9yL3R1bmd1c2thOnJlYWN0aXZlLWFnZ3JlZ2F0ZVwiO1xuaW1wb3J0IHsgUGVvcGxlXzEgfSBmcm9tIFwiLi4vc3RhcnR1cC9zZXJ2ZXIvcmVnaXN0ZXItYXBpXCI7XG5cbk1ldGVvci5wdWJsaXNoKFwidXNlckluZm9cIiwgZnVuY3Rpb24gKCkge1xuICB2YXIgc3ViID0gdGhpcztcbiAgdmFyIG9ic2VydmVIYW5kbGUgPSBNZXRlb3IudXNlcnMuZmluZCh0aGlzLnVzZXJJZCkub2JzZXJ2ZUNoYW5nZXMoe1xuICAgIGFkZGVkOiBmdW5jdGlvbiAoaWQsIGZpZWxkcykge1xuICAgICAgZGVsZXRlIGZpZWxkcy5hcnRpc3RzXG5cbiAgICAgIHN1Yi5hZGRlZCgndXNlcnMnLCBpZCwgZmllbGRzKTtcbiAgICB9LFxuICAgIGNoYW5nZWQ6IGZ1bmN0aW9uIChpZCwgZmllbGRzKSB7XG5cbiAgICAgIHN1Yi5jaGFuZ2VkKCd1c2VycycsIGlkLCBmaWVsZHMpO1xuICAgIH0sXG4gICAgcmVtb3ZlZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICBzdWIucmVtb3ZlZCgndXNlcnMnLCBpZCk7XG4gICAgfVxuICB9KTtcblxufSk7XG5NZXRlb3IucHVibGlzaCgnbXlhcnRpc3RzJywgZnVuY3Rpb24gKCkge1xuICB2YXIgc3ViID0gdGhpcztcbiAgaWYgKHRoaXMudXNlcklkKSB7XG5cbiAgICB2YXIgb2JzZXJ2ZUhhbmRsZSA9IE1ldGVvci51c2Vycy5maW5kKHRoaXMudXNlcklkLCB7IGZpZWxkczogeyBhcnRpc3RzOiAxIH0gfSkub2JzZXJ2ZUNoYW5nZXMoe1xuICAgICAgYWRkZWQ6IGZ1bmN0aW9uIChpZCwgZmllbGRzKSB7XG4gICAgICAgIGlmIChmaWVsZHMuYXJ0aXN0cyAmJiBmaWVsZHMuYXJ0aXN0cy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdG9yZXR1cm4gPSBmaWVsZHMuYXJ0aXN0cy5tYXAoKGVsKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gTWV0ZW9yLmNhbGwoJ2FydGlzdF9zaG9ydF9pbmZvJywgZWwpXG5cblxuICAgICAgICAgIH0pXG4gICAgICAgICAgc3ViLmFkZGVkKCd1c2VycycsIGlkLCB7IGFydGlzdHM6IHRvcmV0dXJuIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2hhbmdlZDogZnVuY3Rpb24gKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgdmFyIHRvcmV0dXJuID0gZmllbGRzLmFydGlzdHMubWFwKChlbCkgPT4ge1xuICAgICAgICAgIHJldHVybiBNZXRlb3IuY2FsbCgnYXJ0aXN0X3Nob3J0X2luZm8nLCBlbClcbiAgICAgICAgfSlcblxuICAgICAgICBzdWIuY2hhbmdlZCgndXNlcnMnLCBpZCwgeyBhcnRpc3RzOiB0b3JldHVybiB9KTtcbiAgICAgIH0sXG5cbiAgICB9KTtcbiAgfVxuXG59KVxuXG5NZXRlb3IucHVibGlzaChcIlNTT0luZm9cIiwgZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy51c2VySWQpXG4gICAgdmFyIHVzZXJJZCA9IE1ldGVvci51c2Vycy5maW5kT25lKHRoaXMudXNlcklkLCB7IGZpZWxkczogeyB0bmlkOiAxIH0gfSkudG5pZFxuXG4gIHJldHVybiBQZW9wbGVfMS5maW5kKHsgX2lkOiB1c2VySWQgfSwge1xuICAgIGZpZWxkczoge1xuICAgICAgZmlyc3ROYW1lOiAxLCBsYXN0TmFtZTogMSwgZW1haWxzOiAxLCBlbWFpbDogMSwgYmlydGhkYXk6IDEsIGF2YXRhcjogMVxuICAgIH1cbiAgfSlcbn0pXG5cbk1ldGVvci5wdWJsaXNoKFwiYXJ0aXN0XCIsIGZ1bmN0aW9uIChpZCkge1xuICBjaGVjayhpZCwgU3RyaW5nKTtcbiAgbGV0IGFydCA9IE1ldGVvci5jYWxsKCdnZXRfYXJ0aXN0JywgaWQpXG4gIC8vY29uc29sZS5sb2coYXJ0KVxuICBpZiAoYXJ0KSB7XG4gICAgYXJ0LmhyZWYgPSBhcnQudHlwZSArIFwiL1wiICsgYXJ0Ll9pZDtcbiAgICBhcnQuaWQgPSBhcnQuX2lkO1xuICAgIGFydC5zbSA9IE1ldGVvci5jYWxsKFwiZ2V0X2FydGlzdF9zbVwiLCBpZCwgYXJ0LnByb2ZpbGUuZ2VucmVzKTtcblxuICAgIGFydC5hbCA9IE1ldGVvci5jYWxsKFwiZ2V0X2FydGlzdF9hbGJ1bXNcIiwgaWQpO1xuICAgIGFydC50cyA9IE1ldGVvci5jYWxsKFwiZ2V0X2FydGlzdF90b3Bzb25nc1wiLCBpZCwgMjQpO1xuICAgIGFydC5sciA9IE1ldGVvci5jYWxsKFwiZ2V0X2FydGlzdF9sclwiLCBpZCk7XG5cbiAgICB0aGlzLmFkZGVkKFwiYXJ0aXN0c1wiLCBhcnQuX2lkLCBhcnQpO1xuICAgIHRoaXMucmVhZHkoKTtcbiAgfVxufSk7XG5cbk1ldGVvci5wdWJsaXNoKFwiZGlzY292ZXJfbnJcIiwgZnVuY3Rpb24gKG51bSkge1xuICBjaGVjayhudW0sIE1hdGNoLkludGVnZXIpO1xuICB2YXIgcmVnaW9uID0gXCJVQVwiO1xuXG4gIHJldHVybiBEaXNjb3Zlci5maW5kKFxuICAgIHtcbiAgICAgIG1hcmtldDogcmVnaW9uLFxuICAgICAgbmFtZTogXCJuZXdyZWxlYXNlc1wiXG4gICAgfSxcbiAgICB7IGZpZWxkczogeyBfaWQ6IDEsIG5hbWU6IDEsIG1hcmtldDogMSwgZGF0YTogeyAkc2xpY2U6IG51bSB9IH0gfVxuICApO1xufSk7XG5NZXRlb3IucHVibGlzaChcImRpc2NvdmVyX2ZlYXR1cmVkXCIsIGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlZ2lvbiA9IFwiVUFcIjtcbiAgcmV0dXJuIERpc2NvdmVyLmZpbmQoe1xuICAgIG1hcmtldDogcmVnaW9uLFxuICAgIG5hbWU6IFwiZmVhdHVyZWRcIlxuICB9KTtcbn0pO1xuTWV0ZW9yLnB1Ymxpc2goXCJkaXNjb3Zlcl9wbGF5bGlzdFwiLCBmdW5jdGlvbiAoKSB7XG4gIHZhciByZWdpb24gPSBcIlVBXCI7XG4gIGNoZWNrKHJlZ2lvbiwgU3RyaW5nKTtcbiAgdmFyIHBsYXlsaXN0cyA9IFBsYXlsaXN0cy5maW5kT25lKFxuICAgIHsgX2lkOiBcImhvdHRyYWNrc3VhXCIsIG1hcmtldDogcmVnaW9uLCB2ZXJpZmllZDogdHJ1ZSB9LFxuICAgIHsgZmllbGRzOiB7IF9pZDogMSB9IH0pO1xuXG4gIGlmIChwbGF5bGlzdHMgJiYgcGxheWxpc3RzLl9pZCkge1xuXG5cbiAgICB2YXIgcGxheWxpc3QgPSBNZXRlb3IuY2FsbChcInJldHVyblBsYXlsaXN0XCIsIHBsYXlsaXN0cy5faWQpO1xuXG4gICAgdGhpcy5hZGRlZChcInBsYXlsaXN0c1wiLCBwbGF5bGlzdC5faWQsIHBsYXlsaXN0KTtcbiAgfVxuICB0aGlzLnJlYWR5KCk7XG5cbn0pO1xuTWV0ZW9yLnB1Ymxpc2goXCJwdWJfcGxheWxpc3RzXCIsIGZ1bmN0aW9uIChsaW1pdCkge1xuICB2YXIgcmVnaW9uID0gXCJVQVwiO1xuICBjaGVjayhyZWdpb24sIFN0cmluZyk7XG4gIHZhciBwbGF5bGlzdHMgPSBQbGF5bGlzdHMuZmluZChcbiAgICB7IF9pZDogeyAkbmU6IFwiaG90dHJhY2tzdWFcIiB9LCBtYXJrZXQ6IHJlZ2lvbiB9LFxuICAgIHsgZmllbGRzOiB7IF9pZDogMSB9LCBsaW1pdDogbGltaXQgPyBsaW1pdCA6IDMwIH1cbiAgKVxuICAvL2NvbnNvbGUubG9nKHBsYXlsaXN0cylcbiAgLy8gaWYgKHBsYXlsaXN0cy5sZW5ndGgpIHtcbiAgcGxheWxpc3RzLmZvckVhY2goYXN5bmMgZSA9PiB7XG4gICAgaWYgKGUuX2lkKSB7XG4gICAgICB2YXIgcGxheWxpc3QgPSBhd2FpdCBNZXRlb3IuY2FsbChcInJldHVybl9wbGF5bGlzdF9zaG9ydFwiLCBlLl9pZCk7XG4gICAgfVxuICAgIHRoaXMuYWRkZWQoXCJwbGF5bGlzdHNcIiwgcGxheWxpc3QuX2lkLCBwbGF5bGlzdCk7XG4gIH0pO1xuICB0aGlzLnJlYWR5KCk7XG4gIC8vICB9XG59KTtcbk1ldGVvci5wdWJsaXNoKFwiYWxidW1cIiwgZnVuY3Rpb24gKGlkKSB7XG4gIHZhciBhbGJ1bSA9IE1ldGVvci5jYWxsKFwicmV0dXJuX2FsYnVtX2Z1bGxcIiwgaWQpO1xuICB0aGlzLmFkZGVkKFwiYWxidW1zXCIsIGFsYnVtLmlkLCBhbGJ1bSk7XG4gIHRoaXMucmVhZHkoKTtcbn0pO1xuXG4vL1RoaXMgcGxheWxpc3QgbmVlZHMgdG8gYmUgdGVzdGVkXG5cbk1ldGVvci5wdWJsaXNoKFwicGxheWxpc3RcIiwgZnVuY3Rpb24gKGlkKSB7XG4gIGNoZWNrKGlkLCBTdHJpbmcpO1xuICB2YXIgc3ViID0gdGhpcztcbiAgdmFyIHBsYXlsaXN0ID0gTWV0ZW9yLmNhbGwoXCJyZXR1cm5QbGF5bGlzdFwiLCBpZCk7XG4gIHZhciBzdWJIYW5kbGUgPSBQbGF5bGlzdHMuZmluZCh7IF9pZDogaWQgfSkub2JzZXJ2ZUNoYW5nZXMoe1xuICAgIGNoYW5nZWQ6IChpZCwgZmllbGRzKSA9PiB7XG4gICAgICB2YXIgcGxheWxpc3QgPSBNZXRlb3IuY2FsbChcInJldHVyblBsYXlsaXN0XCIsIGlkKTtcbiAgICAgIHN1Yi5jaGFuZ2VkKCdwbGF5bGlzdHMnLCBpZCwgcGxheWxpc3QpO1xuXG4gICAgfSxcbiAgICByZW1vdmVkOiBpZCA9PiB7XG4gICAgICB0aGlzLnJlbW92ZWQoXCJwbGF5bGlzdHNcIiwgaWQpO1xuICAgIH1cbiAgfSk7XG4gIC8vIGlmIChwbGF5bGlzdC5hdXRob3JfdXNlcklkID09IHRoaXMudXNlcklkIHx8IHBsYXlsaXN0LnB1YmxpYyA9PSB0cnVlKSB7XG5cbiAgdGhpcy5hZGRlZChcInBsYXlsaXN0c1wiLCBwbGF5bGlzdC5faWQsIHBsYXlsaXN0KTtcbiAgdGhpcy5yZWFkeSgpO1xuICAvLyB9XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goXCJ1c2VyUGxheWxpc3RzXCIsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIFBsYXlsaXN0cy5maW5kKFxuICAgIHsgYXV0aG9yX3VzZXJJZDogdGhpcy51c2VySWQgfSxcbiAgICB7IGZpZWxkczogeyBfaWQ6IDEsIGhyZWY6IDEsIG5hbWU6IDEsIGF1dGhvcl91c2VySWQ6IDEsIHR5cGU6IDEgfSB9XG4gICk7XG59KTtcbk1ldGVvci5wdWJsaXNoKFwiZ2VucmVzXCIsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIEdlbnJlcy5maW5kKCk7XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goXCJuZXdfcmVsZWFzZXNcIiwgZnVuY3Rpb24gKGxpbWl0KSB7XG4gIGxldCBhbGJ1bXMgPSBBbGJ1bXMuZmluZChcbiAgICB7XG4gICAgICBhbGJ1bV90eXBlOiB7ICRuZTogXCJzaW5nbGVcIiB9LFxuICAgICAgYWRkZWRfYXQ6IHtcbiAgICAgICAgJGd0ZTogbmV3IERhdGUobmV3IERhdGUoKS5nZXRUaW1lKCkgLSAyNCAqIDE0ICogNjAgKiA2MCAqIDEwMDApXG4gICAgICB9XG4gICAgfSxcbiAgICB7IGZpZWxkczogeyBfaWQ6IDEgfSwgbGltaXQ6IGxpbWl0ID8gbGltaXQgOiAxMiwgc29ydDogeyBhZGRlZF9hdDogLTEgfSB9XG4gICkuZmV0Y2goKTtcbiAgYWxidW1zLmZvckVhY2goKGUsIGkpID0+IHtcbiAgICBsZXQgYWxidW0gPSBNZXRlb3IuY2FsbChcInJldHVybl9hbGJ1bVwiLCBlLl9pZCk7XG4gICAgdGhpcy5hZGRlZChcImFsYnVtc1wiLCBlLl9pZCwgYWxidW0pO1xuICB9KTtcbiAgdGhpcy5yZWFkeSgpO1xufSk7XG5NZXRlb3IucHVibGlzaChcIm5ld190cmFja3NcIiwgZnVuY3Rpb24gKGxpbSkge1xuICAvLyBhZGRlZF9hdDogeyAkZ3RlOiBuZXcgRGF0ZShuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIDI0ICogMjggKiA2MCAqIDYwICogMTAwMCkgfSBcbiAgbGV0IHNpbmdsZXMgPSBBbGJ1bXMuZmluZChcbiAgICB7IGFsYnVtX3R5cGU6IFwic2luZ2xlXCIsIH0sXG4gICAgeyBsaW1pdDogbGltID8gbGltIDogMTYsIGZpZWxkczogeyBfaWQ6IDEgfSwgc29ydDogeyBhZGRlZF9hdDogLTEgfSB9XG4gICkuZmV0Y2goKTtcbiAgc2luZ2xlcy5mb3JFYWNoKChlLCBpKSA9PiB7XG4gICAgdmFyIGZ0ID0gTWV0ZW9yLmNhbGwoXCJnZXRfYWxidW1fdHJhY2tzXCIsIGUuX2lkKTtcbiAgICBmdC5mb3JFYWNoKGVsID0+IHtcblxuICAgICAgdGhpcy5hZGRlZChcInRyYWNrc1wiLCBlbC5faWQsIGVsKTtcbiAgICB9KTtcbiAgfSk7XG4gIHRoaXMucmVhZHkoKTtcbn0pO1xuTWV0ZW9yLnB1Ymxpc2goXCJhY2NvdW50XCIsIGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgdmFyIHBvID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodGhpcy51c2VySWQpLnRuaWQ7XG4gICAgdmFyIHVzZXIgPSBQZW9wbGVfMS5maW5kT25lKHBvLCB7XG4gICAgICBmaWVsZHM6IHtcbiAgICAgICAgX2lkOiAxLFxuICAgICAgICBhdmF0YXI6IDEsXG4gICAgICAgIGZpcnN0TmFtZTogMSxcbiAgICAgICAgbGFzdE5hbWU6IDEsXG4gICAgICAgIGJpcnRoZGF5OiAxLFxuICAgICAgICBlbWFpbDogMSxcbiAgICAgICAgZW1haWxzOiAxXG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5hZGRlZChcInVzZXJzXCIsIHRoaXMudXNlcklkLCB1c2VyKTtcbiAgICB0aGlzLnJlYWR5KCk7XG4gIH1cbn0pO1xuTWV0ZW9yLnB1Ymxpc2goXCJ0cmVuZGluZ1wiLCBmdW5jdGlvbiAoKSB7XG4gIHNlbGYgPSB0aGlzO1xuICB2YXIgcGwgPSB7XG4gICAgX2lkOiBcInRvcHRyYWNrc3VhXCIsXG4gICAgZGF0YTogW10sXG4gICAgbmFtZTogXCJUcmVuZGluZyBUcmFja3NcIixcbiAgICB0eXBlOiBcInBsYXlsaXN0XCIsXG4gICAgYXV0bzogdHJ1ZVxuICB9O1xuICB2YXIgcGlwZWxpbmUgPSBbXG4gICAge1xuICAgICAgJG1hdGNoOiB7XG4gICAgICAgIGRhdGU6IHsgJGd0ZTogbmV3IERhdGUobmV3IERhdGUoKS5nZXRUaW1lKCkgLSAyNCAqIDcgKiA2MCAqIDYwICogMTAwMCkgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgJGdyb3VwOiB7XG4gICAgICAgIF9pZDogXCIkaXRlbS5pZFwiLFxuICAgICAgICBkYXRlOiB7ICRsYXN0OiBcIiRkYXRlXCIgfSxcbiAgICAgICAgdG90YWxQbGF5czogeyAkc3VtOiAxIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHsgJHNvcnQ6IHsgZGF0ZTogLTEsIHRvdGFsUGxheXM6IC0xIH0gfSxcbiAgICB7ICRsaW1pdDogMjAgfVxuICBdO1xuXG4gIEFjdGl2aXRpZXMucmF3Q29sbGVjdGlvbigpXG4gICAgLmFnZ3JlZ2F0ZShwaXBlbGluZSlcbiAgICAudG9BcnJheShcbiAgICAgIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24gKGVyciwgc29ydCkge1xuICAgICAgICBzb3J0LmZvckVhY2goKGVsLCBpbmQpID0+IHtcbiAgICAgICAgICB2YXIgdHJhY2sgPSBNZXRlb3IuY2FsbChcImdldF9mdWxsX3RyYWNrXCIsIGVsLl9pZCk7XG4gICAgICAgICAgaWYgKHRyYWNrKSB7XG4gICAgICAgICAgICB0cmFjay5wb3NpdGlvbiA9IGluZCArIDE7XG5cbiAgICAgICAgICAgIHBsLmRhdGEucHVzaCh0cmFjayk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vICAgQWN0aXZpdGllcy5yZW1vdmUoeyAnaXRlbS5pZCc6IGVsLl9pZCB9KVxuICAgICAgICAgICAgLy8gICAgY29uc29sZS5sb2coJ0RFTEVURSAnICsgZWwuX2lkKVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VsZi5hZGRlZChcInBsYXlsaXN0c1wiLCBwbC5faWQsIHBsKTtcbiAgICAgIH0pXG4gICAgKTtcblxuICB2YXIgZGlzY28xID0ge1xuICAgIF9pZDogXCJ0b3BwbGF5bGlzdHNcIixcbiAgICBuYW1lOiBcIlRvcCBQbGF5bGlzdHNcIixcbiAgICBkYXRhOiBbXSxcblxuICAgIG1hcmtldDogXCJVQVwiLFxuICAgIGF1dG86IHRydWVcbiAgfTtcbiAgcGxheWxpc3RzID0gUGxheWxpc3RzLmZpbmQoXG4gICAgeyBfaWQ6IHsgJG5lOiBcImhvdHRyYWNrc3VhXCIgfSB9LFxuICAgIHsgZmllbGRzOiB7IF9pZDogMSB9LCBzb3J0OiB7IHBsYXlzOiAtMSB9IH1cbiAgKS5mZXRjaCgpO1xuICBwbGF5bGlzdHMuZm9yRWFjaCgoZWwsIGluZCkgPT4ge1xuICAgIGxldCBwbGF5bGlzdCA9IE1ldGVvci5jYWxsKFwicmV0dXJuX3BsYXlsaXN0X3Nob3J0XCIsIGVsLl9pZCk7XG4gICAgcGxheWxpc3QucG9zaXRpb24gPSBpbmQgKyAxO1xuICAgIGRpc2NvMS5kYXRhLnB1c2gocGxheWxpc3QpO1xuICB9KTtcblxuICB2YXIgcGlwZWxpbmUgPSBbXG4gICAgeyAkZ3JvdXA6IHsgX2lkOiBcIiRhbGJ1bVwiLCB0b3RhbFBsYXlzOiB7ICRzdW06IFwiJHBsYXlzXCIgfSB9IH0sXG4gICAgeyAkc29ydDogeyB0b3RhbFBsYXlzOiAtMSB9IH1cbiAgXTtcbiAgVHJhY2tzLnJhd0NvbGxlY3Rpb24oKVxuICAgIC5hZ2dyZWdhdGUocGlwZWxpbmUpXG4gICAgLnRvQXJyYXkoXG4gICAgICBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uIChlcnIsIHNvcnQpIHtcbiAgICAgICAgc29ydC5mb3JFYWNoKChlbCwgaW5kKSA9PiB7XG4gICAgICAgICAgdmFyIGFsYnVtID0gTWV0ZW9yLmNhbGwoXCJyZXR1cm5fYWxidW1cIiwgZWwuX2lkKTtcblxuICAgICAgICAgIGFsYnVtLnBvc2l0aW9uID0gaW5kICsgMTtcbiAgICAgICAgICBpZiAoYWxidW0pIHtcbiAgICAgICAgICAgIHNlbGYuYWRkZWQoXCJhbGJ1bXNcIiwgYWxidW0uX2lkLCBhbGJ1bSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgKTtcblxuICBzZWxmLmFkZGVkKFwiZGlzY292ZXJcIiwgZGlzY28xLl9pZCwgZGlzY28xKTtcbiAgc2VsZi5yZWFkeSgpO1xufSk7XG5NZXRlb3IucHVibGlzaChcImxpYnJhcnlfc29uZ3NcIiwgZnVuY3Rpb24gKCkge1xuICB1c2VySWQgPSB0aGlzLnVzZXJJZDtcbiAgLy8gUmVtZW1iZXIsIFJlYWN0aXZlQWdncmVnYXRlIGRvZXNuJ3QgcmV0dXJuIGFueXRoaW5nXG4gIHZhciBwaXBlbGluZSA9IFtcbiAgICB7ICRtYXRjaDogeyBfaWQ6IHVzZXJJZCB9IH0sXG4gICAgeyAkdW53aW5kOiBcIiRsaWJyYXJ5XCIgfSxcbiAgICB7ICRtYXRjaDogeyBcImxpYnJhcnkuaXRlbS50eXBlXCI6IFwidHJhY2tcIiB9IH0sXG4gICAge1xuICAgICAgJGdyb3VwOiB7XG4gICAgICAgIF9pZDogXCIkbGlicmFyeS5pdGVtLl9pZFwiLFxuICAgICAgICB0cmFjazogeyAkZmlyc3Q6IFwiJGxpYnJhcnkuaXRlbVwiIH0sXG4gICAgICAgIGFkZGVkX2F0OiB7ICRsYXN0OiBcIiRsaWJyYXJ5LmFkZGVkX2F0XCIgfVxuICAgICAgfVxuICAgIH0sXG4gICAgeyAkcHJvamVjdDogeyB0cmFjazogMSwgX2lkOiAxLCBhZGRlZF9hdDogMSB9IH0sXG4gICAgeyAkc29ydDogeyBcInRyYWNrLnRpdGxlXCI6IDEgfSB9XG4gIF07XG5cbiAgUmVhY3RpdmVBZ2dyZWdhdGUoXG4gICAgdGhpcyxcbiAgICBNZXRlb3IudXNlcnMsIC8vIFNlbmQgdGhlIGFnZ3JlZ2F0aW9uIHRvIHRoZSAnY2xpZW50UmVwb3J0JyBjb2xsZWN0aW9uIGF2YWlsYWJsZSBmb3IgY2xpZW50IHVzZSBieSB1c2luZyB0aGUgY2xpZW50Q29sbGVjdGlvbiBwcm9wZXJ0eSBvZiBvcHRpb25zLlxuICAgIHBpcGVsaW5lLFxuICAgIHsgY2xpZW50Q29sbGVjdGlvbjogXCJsaWJyYXJ5U29uZ3NcIiB9XG4gICk7XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goXCJteXVwbG9hZHNcIiwgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gVXNlclRyYWNrcy5maW5kKHsgdXBsb2FkZWRfYnk6IHRoaXMudXNlcklkIH0pO1xufSk7XG5cbi8qKlxuICpcbiAqIFNlcnZlciBGdW5jdGlvbnMgYXJlIGJlbG93XG4gKlxuICpcbiAqL1xuXG5NZXRlb3IucHVibGlzaChcImdlbnJlX2FsYnVtc1wiLCBmdW5jdGlvbiAoX2lkKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgY2hlY2soX2lkLCBTdHJpbmcpO1xuXG4gIHZhciBhbGJ1bXMgPSBBbGJ1bXMuZmluZChfaWQgPT0gXCJhbGxcIiA/IHt9IDogeyBnZW5yZXM6IHsgJGluOiBbX2lkXSB9IH0sIHtcbiAgICBmaWVsZHM6IHsgX2lkOiAxIH1cbiAgfSkuZmV0Y2goKTtcbiAgdmFyIHRvUmV0dXJuID0gTWV0ZW9yLmNhbGwoXG4gICAgXCJnZXRfYWxidW1zXCIsXG4gICAgYWxidW1zLm1hcChlbCA9PiBlbC5faWQpXG4gICk7XG4gIHRvUmV0dXJuLmZvckVhY2goKGVsLCBpbmQpID0+IHtcbiAgICBzZWxmLmFkZGVkKFwiYWxidW1zXCIsIGVsLl9pZCwgZWwpO1xuICB9KTtcblxuICB2YXIgb2JzZXJ2ZUhhbmRsZSA9IEFsYnVtcy5maW5kKHt9KS5vYnNlcnZlQ2hhbmdlcyh7XG4gICAgYWRkZWQ6IGZ1bmN0aW9uIChpZCwgZmllbGRzKSB7XG5cbiAgICB9LFxuICAgIGNoYW5nZWQ6IGZ1bmN0aW9uIChpZCwgZmllbGRzKSB7XG5cblxuICAgIH0sXG4gICAgcmVtb3ZlZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICBzZWxmLnJlbW92ZWQoJ2FsYnVtcycsIGlkKTtcbiAgICB9XG4gIH0pO1xuXG5cblxuICBzZWxmLnJlYWR5KCk7XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goXCJteXJlbGVhc2VzXCIsIGZ1bmN0aW9uIChzcGFjZV9pZCkge1xuICByZXR1cm4gUmVsZWFzZXMuZmluZChcbiAgICB7IFwic3BhY2Uub3duZXJcIjogdGhpcy51c2VySWQgfSxcbiAgICB7IGZpZWxkczogeyB0cmFja3M6IDAgfSB9XG4gICk7XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goXCJyZWxlYXNlXCIsIGZ1bmN0aW9uIChpZCkge1xuICByZXR1cm4gUmVsZWFzZXMuZmluZCh7IF9pZDogaWQsIFwic3BhY2Uub3duZXJcIjogdGhpcy51c2VySWQgfSk7XG59KTtcblxuXG5cblJvdXRlci5yb3V0ZShcIi9hcGkvYXJ0aXN0cy86YVwiLCB7XG4gIHdoZXJlOiBcInNlcnZlclwiXG59KS5nZXQoZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMucmVzcG9uc2Uuc2V0SGVhZGVyKFwiQ29udGVudC10eXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcbiAgdGhpcy5yZXNwb25zZS5zZXRIZWFkZXIoXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIiwgXCIqXCIpO1xuICBsZXQgYXJ0aXN0cyA9IEFydGlzdHMuZmluZCh7XG4gICAgc3RhZ2VfbmFtZToge1xuICAgICAgJHJlZ2V4OiBuZXcgUmVnRXhwKHNlbGYucGFyYW1zLmEsIFwiaVwiKVxuICAgIH1cbiAgfSkuZmV0Y2goKVxuXG4gIHNlbGYucmVzcG9uc2UuZW5kKEpTT04uc3RyaW5naWZ5KGFydGlzdHMpKTtcblxuXG59KTtcblxuXG5NZXRlb3IucHVibGlzaChcInJlY2VudGx5X3BsYXllZFwiLCBmdW5jdGlvbiAoKSB7XG4gIHVzZXJJZCA9IHRoaXMudXNlcklkO1xuICAvLyBSZW1lbWJlciwgUmVhY3RpdmVBZ2dyZWdhdGUgZG9lc24ndCByZXR1cm4gYW55dGhpbmdcbiAgdmFyIHBpcGVsaW5lID0gW1xuICAgIHsgJG1hdGNoOiB7IF9pZDogdXNlcklkIH0gfSxcbiAgICB7ICR1bndpbmQ6IFwiJHJlY2VudGx5X3BsYXllZFwiIH0sXG4gICAge1xuICAgICAgJGdyb3VwOiB7XG4gICAgICAgIF9pZDogXCIkcmVjZW50bHlfcGxheWVkLml0ZW0uYWxidW0uX2lkXCIsXG4gICAgICAgIGFsYnVtOiB7ICRsYXN0OiBcIiRyZWNlbnRseV9wbGF5ZWQuaXRlbS5hbGJ1bVwiIH0sXG4gICAgICAgIGRhdGE6IHsgJGxhc3Q6IFwiJHJlY2VudGx5X3BsYXllZC5pdGVtXCIgfSxcbiAgICAgICAgZGF0ZTogeyAkbGFzdDogXCIkcmVjZW50bHlfcGxheWVkLmRhdGVcIiB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7ICRwcm9qZWN0OiB7IGFsYnVtOiAxLCBfaWQ6IDEsIGRhdGU6IDEsIGRhdGE6IDEgfSB9LFxuICAgIHsgJHNvcnQ6IHsgXCJkYXRlXCI6IC0xIH0gfVxuICBdO1xuXG4gIFJlYWN0aXZlQWdncmVnYXRlKFxuICAgIHRoaXMsXG4gICAgTWV0ZW9yLnVzZXJzLCAvLyBTZW5kIHRoZSBhZ2dyZWdhdGlvbiB0byB0aGUgJ2NsaWVudFJlcG9ydCcgY29sbGVjdGlvbiBhdmFpbGFibGUgZm9yIGNsaWVudCB1c2UgYnkgdXNpbmcgdGhlIGNsaWVudENvbGxlY3Rpb24gcHJvcGVydHkgb2Ygb3B0aW9ucy5cbiAgICBwaXBlbGluZSxcbiAgICB7IGNsaWVudENvbGxlY3Rpb246IFwicmVjZW50bHlfcGxheWVkXCIgfVxuICApO1xufSk7IiwiLy8gSW1wb3J0IG1vZHVsZXMgdXNlZCBieSBib3RoIGNsaWVudCBhbmQgc2VydmVyIHRocm91Z2ggYSBzaW5nbGUgaW5kZXggZW50cnkgcG9pbnRcbi8vIGUuZy4gdXNlcmFjY291bnRzIGNvbmZpZ3VyYXRpb24gZmlsZS5cbmltcG9ydCAgJy9pbXBvcnRzL2FwaS9jb2xsZWN0aW9ucy5qcyc7XG5leHBvcnQge01hcmtldHMsQWxidW1zfSBmcm9tICcvaW1wb3J0cy9hcGkvY29sbGVjdGlvbnMuanMnOyIsIi8vIEZpbGwgdGhlIERCIHdpdGggZXhhbXBsZSBkYXRhIG9uIHN0YXJ0dXBcblxuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5cbiIsIi8vIEltcG9ydCBzZXJ2ZXIgc3RhcnR1cCB0aHJvdWdoIGEgc2luZ2xlIGluZGV4IGVudHJ5IHBvaW50XG5pbXBvcnQgJy4uLy4uL2FwaS9saW5rcy9tZXRob2RzLmpzJ1xuaW1wb3J0ICcuLi8uLi9hcGkvcHVibGljYXRpb25zLmpzJ1xuaW1wb3J0ICcuL2ZpeHR1cmVzLmpzJztcbmltcG9ydCAnLi9yZWdpc3Rlci1hcGkuanMnO1xuaW1wb3J0ICcuL3NlYXJjaEluZGV4ZXMuanMnIiwiXG5leHBvcnQgY29uc3QgU2hhcmVkVG9rZW5zID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ3NoYXJlZHRva2VucycpXG4vLyBSZWdpc3RlciB5b3VyIGFwaXMgaGVyZVxuXG5cbmNvbnN0IGFjY291bnRzRG9tYWluID0gTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5vdXJVcmxzID8gTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5vdXJVcmxzLmFjY291bnRzIDogXCJodHRwOi8vbG9jYWxob3N0OjMwMDVcIjtcblxuY29uc3QgTkJBY2NvdW50cyA9IEREUC5jb25uZWN0KGFjY291bnRzRG9tYWluKTtcbk5CQWNjb3VudHMuc3Vic2NyaWJlKCdzZXJ2ZXJDb250ZW50JylcbmV4cG9ydCBjb25zdCBQZW9wbGVfMSA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd1c2VycycsIHtcbiAgY29ubmVjdGlvbjogTkJBY2NvdW50cyxcbiAgX3N1cHByZXNzU2FtZU5hbWVFcnJvcjogdHJ1ZSxcblxufSlcblxuQWNjb3VudHMucmVnaXN0ZXJMb2dpbkhhbmRsZXIoXCJzc28yXCIsIG9wdGlvbnMgPT4ge1xuICBpZiAoIW9wdGlvbnMuaXQpIHtcbiAgICByZXR1cm5cbiAgfVxuICB2YXIgdmFsaWQgPSBOQkFjY291bnRzLmNhbGwoJ3ZhbGlkYXRlVG9rZW4nLCBvcHRpb25zKVxuXG4gIGlmICh2YWxpZCAmJiB2YWxpZC51c2VySWQpIHtcbiAgICB2YXIgTFQgPSB7XG5cbiAgICAgIHVzZXJJZDogTWV0ZW9yLnVzZXJzLmZpbmRPbmUoeyB0bmlkOiB2YWxpZC51c2VySWQgfSlcbiAgICAgICAgPyBNZXRlb3IudXNlcnMuZmluZE9uZSh7IHRuaWQ6IHZhbGlkLnVzZXJJZCB9KS5faWRcbiAgICAgICAgOiBNZXRlb3IuY2FsbChcImNyZWF0ZUFjY291bnRcIiwgdmFsaWQudXNlcklkKVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB1c2VySWQ6IExULnVzZXJJZCxcblxuICAgIH1cbiAgfSBlbHNlIHtcblxuICAgIHJldHVybiB7XG4gICAgICAvLyAgdXNlcklkOiB1c2VyLl9pZCxcbiAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKFxuICAgICAgICA0MDMsXG4gICAgICAgIFwiXCJcbiAgICAgIClcbiAgICB9O1xuICB9XG59KTtcblxuQWNjb3VudHMub25Mb2dpbigoYXR0ZW1wdCkgPT4ge1xuICBpZiAoYXR0ZW1wdC50eXBlID09IFwic3NvMlwiKSB7XG4gICAgdmFyIExUID0ge1xuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgZ2lkOiBhdHRlbXB0Lm1ldGhvZEFyZ3VtZW50c1swXS5pdC5zbGljZSg0MCwgNjApLFxuICAgICAgdXNlcklkOiBhdHRlbXB0LnVzZXIuX2lkLFxuICAgICAgdG9rZW46IEFjY291bnRzLl9nZXRMb2dpblRva2VuKGF0dGVtcHQuY29ubmVjdGlvbi5pZClcbiAgICB9XG4gICAgU2hhcmVkVG9rZW5zLmluc2VydChMVClcbiAgICByZXR1cm4ge1xuICAgICAgdXNlcklkOiBMVC51c2VySWQsXG4gICAgfVxuICB9XG59KVxuTWV0ZW9yLm1ldGhvZHMoe1xuICAnbG9nb3V0VXNlcicodXNlciwgZ2lkcykge1xuICAgIHZhciB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoeyB0bmlkOiB1c2VyIH0sIHsgZmllbGRzOiB7IGlkOiAxIH0gfSlcbiAgICB2YXIgdG9rZW5zID0gU2hhcmVkVG9rZW5zLmZpbmQoeyBnaWQ6IHsgJGluOiBnaWRzIH0gfSwgeyBmaWVsZHM6IHsgdG9rZW46IDEgfSB9KS5mZXRjaCgpLm1hcCgoZWwsIGluZGV4KSA9PiBlbC50b2tlbilcbiAgICBNZXRlb3IudXNlcnMudXBkYXRlKHVzZXIuX2lkLCB7ICRwdWxsOiB7ICdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMnOiB7IGhhc2hlZFRva2VuOiB7ICRpbjogdG9rZW5zIH0gfSB9IH0pXG4gIH1cbn0pXG5cbkFjY291bnRzLnZhbGlkYXRlTG9naW5BdHRlbXB0KCh1c2VyLCBjb25uZWN0aW9uKSA9PiB7XG5cbiAgcmV0dXJuIHRydWVcbn0pXG5cbk1ldGVvci5kZWZhdWx0X3NlcnZlci5tZXRob2RfaGFuZGxlcnNbXCJsb2dvdXRcIl0gPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IGFjY291bnRzID0gQWNjb3VudHM7XG4gIGxldCB1c2VyID0gdGhpcy51c2VySWQ7XG4gIGxldCBjb25uID0gdGhpcy5jb25uZWN0aW9uO1xuICB2YXIgdG9rZW4gPSBBY2NvdW50cy5fZ2V0TG9naW5Ub2tlbih0aGlzLmNvbm5lY3Rpb24uaWQpO1xuICBhY2NvdW50cy5fc2V0TG9naW5Ub2tlbih0aGlzLnVzZXJJZCwgdGhpcy5jb25uZWN0aW9uLCBudWxsKTtcbiAgaWYgKHRva2VuICYmIHRoaXMudXNlcklkKSBhY2NvdW50cy5kZXN0cm95VG9rZW4odGhpcy51c2VySWQsIHRva2VuKTtcbiAgYWNjb3VudHMuX3N1Y2Nlc3NmdWxMb2dvdXQodGhpcy5jb25uZWN0aW9uLCB0aGlzLnVzZXJJZCk7XG4gIHRoaXMuc2V0VXNlcklkKG51bGwpO1xuXG4gIHZhciB0b2tlbnMgPSBTaGFyZWRUb2tlbnMuZmluZCh7IHRva2VuOiB0b2tlbiB9LCB7IGZpZWxkczogeyBnaWQ6IDEsIF9pZDogMCB9IH0pLmZldGNoKClcbiAgU2hhcmVkVG9rZW5zLnVwZGF0ZSh7IHRva2VuOiB0b2tlbiB9LCB7ICRzZXQ6IHsgc3RhdHVzOiAnaW5hY3RpdmUnIH0gfSlcblxuICB2YXIgZ2lkcyA9IHRva2Vucy5tYXAoZnVuY3Rpb24gKHsgZ2lkIH0sIGluZGV4KSB7XG4gICAgcmV0dXJuIGdpZDtcbiAgfSk7XG5cbiAgdmFyIGlkID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlciwgeyBmaWVsZHM6IHsgdG5pZDogMSB9IH0pLnRuaWRcbiAgTkJBY2NvdW50cy5jYWxsKCdsb2dvdXRVc2VyJywgaWQsIGdpZHMsIGNvbm4pXG5cblxufSIsImltcG9ydCB7IFRyYWNrcywgQWxidW1zLCBBcnRpc3RzLCBQbGF5bGlzdHMgfSBmcm9tIFwiLi4vLi4vYXBpL2NvbGxlY3Rpb25zLmpzXCI7XG4vL1RyYWNrcy5fZHJvcEluZGV4KFwibmFtZV90ZXh0XCIpO1xuaW1wb3J0IFwiLi4vLi4vYXBpL2xpbmtzL21ldGhvZHMuanNcIjtcbmltcG9ydCB7IGNoZWNrIH0gZnJvbSBcIm1ldGVvci9jaGVja1wiO1xuXG52YXIgZWxhc3RpY3NlYXJjaCA9IE5wbS5yZXF1aXJlKFwiZWxhc3RpY3NlYXJjaFwiKTtcbnZhciBjbGllbnQgPSBuZXcgZWxhc3RpY3NlYXJjaC5DbGllbnQoe1xuICBob3N0OiBNZXRlb3Iuc2V0dGluZ3MuZWxhc3RpY3NlcnZlciA/IE1ldGVvci5zZXR0aW5ncy5lbGFzdGljc2VydmVyLnVybCA6IFwiaHR0cDovLzE5Mi4xNjguMzEuNTA6OTIwMFwiXG4gIC8vIGxvZzogJ3RyYWNlJ1xufSk7XG5cbmZ1bmN0aW9uIGdldFVuaXF1ZShhcnIsIGNvbXApIHtcbiAgY29uc3QgdW5pcXVlID0gYXJyXG4gICAgLm1hcChlID0+IGVbY29tcF0pXG5cbiAgICAvLyBzdG9yZSB0aGUga2V5cyBvZiB0aGUgdW5pcXVlIG9iamVjdHNcbiAgICAubWFwKChlLCBpLCBmaW5hbCkgPT4gZmluYWwuaW5kZXhPZihlKSA9PT0gaSAmJiBpKVxuXG4gICAgLy8gZWxpbWluYXRlIHRoZSBkZWFkIGtleXMgJiBzdG9yZSB1bmlxdWUgb2JqZWN0c1xuICAgIC5maWx0ZXIoZSA9PiBhcnJbZV0pXG4gICAgLm1hcChlID0+IGFycltlXSk7XG5cbiAgcmV0dXJuIHVuaXF1ZTtcbn1cblxuTWV0ZW9yLm1ldGhvZHMoe1xuICBhc3luYyBzZWFyY2hfc29uZ3MocXVlKSB7XG4gICAgdmFyIHNlYXJjaFRleHQgPSBxdWU7XG5cbiAgICAvLyAgcmV0dXJuO1xuXG4gICAgaWYgKCFxdWUubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGxldCBsYXN0V29yZCA9IHNlYXJjaFRleHRcbiAgICAgIC50cmltKClcbiAgICAgIC5zcGxpdChcIiBcIilcbiAgICAgIC5zcGxpY2UoLTEpWzBdO1xuXG4gICAgbGV0IHF1ZXJ5ID0ge1xuICAgICAgYm9vbDoge1xuICAgICAgICBtdXN0OiB7XG4gICAgICAgICAgZGlzX21heDoge1xuICAgICAgICAgICAgcXVlcmllczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbWF0Y2hfcGhyYXNlOiB7XG4gICAgICAgICAgICAgICAgICB0aXRsZTogeyBxdWVyeTogc2VhcmNoVGV4dCwgc2xvcDogMyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7IG1hdGNoOiB7IHRpdGxlOiB7IHF1ZXJ5OiBzZWFyY2hUZXh0LCBib29zdDogMS4yNSB9IH0gfSxcbiAgICAgICAgICAgICAgeyBwcmVmaXg6IHsgdGl0bGU6IHNlYXJjaFRleHQgfSB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmVzdGVkOiB7XG4gICAgICAgICAgICAgICAgICBwYXRoOiBcImFydGlzdHNcIixcblxuICAgICAgICAgICAgICAgICAgcXVlcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2g6IHtcbiAgICAgICAgICAgICAgICAgICAgICBcImFydGlzdHMuc3RhZ2VfbmFtZVwiOiB7IHF1ZXJ5OiBzZWFyY2hUZXh0LCBib29zdDogMS41IH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5lc3RlZDoge1xuICAgICAgICAgICAgICAgICAgcGF0aDogXCJhcnRpc3RzXCIsXG4gICAgICAgICAgICAgICAgICBxdWVyeToge1xuICAgICAgICAgICAgICAgICAgICBwcmVmaXg6IHtcbiAgICAgICAgICAgICAgICAgICAgICBcImFydGlzdHMuc3RhZ2VfbmFtZVwiOiBzZWFyY2hUZXh0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuZXN0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgIHBhdGg6IFwiZmVhdHVyaW5nX2FydGlzdHNcIixcbiAgICAgICAgICAgICAgICAgIHF1ZXJ5OiB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgXCJmZWF0dXJpbmdfYXJ0aXN0cy5zdGFnZV9uYW1lXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5OiBzZWFyY2hUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9vc3Q6IDEuMjVcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuZXN0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgIHBhdGg6IFwiZmVhdHVyaW5nX2FydGlzdHNcIixcbiAgICAgICAgICAgICAgICAgIHF1ZXJ5OiB7XG4gICAgICAgICAgICAgICAgICAgIHByZWZpeDoge1xuICAgICAgICAgICAgICAgICAgICAgIFwiZmVhdHVyaW5nX2FydGlzdHMuc3RhZ2VfbmFtZVwiOiBzZWFyY2hUZXh0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHsgbWF0Y2g6IHsgYWxidW06IHsgcXVlcnk6IHNlYXJjaFRleHQsIGJvb3N0OiAxLjMgfSB9IH0sXG4gICAgICAgICAgICAgIHsgcHJlZml4OiB7IGFsYnVtOiBzZWFyY2hUZXh0IH0gfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gYm9vc3Q6IDEsXG4gICAgICAgIGZpbHRlcjoge1xuICAgICAgICAgIHRlcm06IHtcbiAgICAgICAgICAgIHR5cGU6IFwidHJhY2tcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBsZXQgcmVzdWx0cyA9IFtdO1xuXG4gICAgdmFyIHJlc3VsdCA9IGF3YWl0IGNsaWVudC5zZWFyY2goe1xuICAgICAgaW5kZXg6IFwiZGF0YWJhc2UxXCIsXG4gICAgICBib2R5OiB7IHF1ZXJ5OiBxdWVyeSB9XG4gICAgfSk7XG5cbiAgICByZXN1bHQuaGl0cy5oaXRzLmZvckVhY2goZnVuY3Rpb24gKGRvYykge1xuICAgICAgaWYgKGRvYy5fc291cmNlLnR5cGUgPT0gXCJ0cmFja1wiKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmFyIHRhID0gTWV0ZW9yLmNhbGwoXCJnZXRfZnVsbF90cmFja1wiLCBkb2MuX2lkKVxuICAgICAgICAgIGlmICh0YS5faWQpIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCh0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9LFxuXG4gIGFzeW5jIHNlYXJjaF9hbGJ1bXMoc2Vhcikge1xuICAgIGNoZWNrKHNlYXIsIFN0cmluZyk7XG4gICAgaWYgKCFzZWFyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgc2VhcmNoVGV4dCA9IHNlYXI7XG4gICAgdmFyIGxhc3RXb3JkID0gc2VhclxuICAgICAgLnRyaW0oKVxuICAgICAgLnNwbGl0KFwiIFwiKVxuICAgICAgLnNwbGljZSgtMSlbMF07XG4gICAgbGV0IHF1ZXJ5ID0ge1xuICAgICAgYm9vbDoge1xuICAgICAgICBmaWx0ZXI6IHtcbiAgICAgICAgICB0ZXJtOiB7XG4gICAgICAgICAgICB0eXBlOiBcImFsYnVtXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG11c3Q6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBib29sOiB7XG4gICAgICAgICAgICAgIHNob3VsZDogW1xuICAgICAgICAgICAgICAgIHsgbWF0Y2g6IHsgbmFtZTogeyBxdWVyeTogc2VhcmNoVGV4dCwgYm9vc3Q6IDEuMjUgfSB9IH0sXG4gICAgICAgICAgICAgICAgeyBwcmVmaXg6IHsgbmFtZTogc2VhcmNoVGV4dCB9IH0sXG5cbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBuZXN0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogXCJhcnRpc3RzXCIsXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgbWF0Y2hfcGhyYXNlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImFydGlzdHMuc3RhZ2VfbmFtZVwiOiBzZWFyY2hUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBuZXN0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogXCJhcnRpc3RzXCIsXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgbWF0Y2hfcGhyYXNlX3ByZWZpeDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJhcnRpc3RzLnN0YWdlX25hbWVcIjogc2VhcmNoVGV4dFxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgcmVzdWx0ID0gYXdhaXQgY2xpZW50LnNlYXJjaCh7XG4gICAgICBpbmRleDogXCJkYXRhYmFzZTFcIixcbiAgICAgIGJvZHk6IHsgcXVlcnk6IHF1ZXJ5IH1cbiAgICB9KTtcblxuICAgIHZhciB3b3cgPSByZXN1bHQuaGl0cy5oaXRzLm1hcChmdW5jdGlvbiAoeyBfaWQsIC4uLm5vbnNlbnNlIH0sIGluZGV4KSB7XG4gICAgICByZXR1cm4gX2lkO1xuICAgIH0pO1xuXG4gICAgbGV0IHJlc3VsdHMgPSBhd2FpdCBNZXRlb3IuY2FsbChcImdldF9hbGJ1bXNcIiwgd293KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSxcbiAgYXN5bmMgc2VhcmNoX2FydGlzdHMoc2Vhcikge1xuICAgIGNoZWNrKHNlYXIsIFN0cmluZyk7XG4gICAgaWYgKCFzZWFyLmxlbmd0aCAmJiBzZWFyLmxlbmd0aCA8PSAyKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHZhciBzZWFyY2hUZXh0ID0gc2VhcjtcbiAgICB2YXIgbGFzdFdvcmQgPSBzZWFyXG4gICAgICAudHJpbSgpXG4gICAgICAuc3BsaXQoXCIgXCIpXG4gICAgICAuc3BsaWNlKC0xKVswXTtcbiAgICB2YXIgcXVlcnkgPSB7XG4gICAgICBib29sOiB7XG4gICAgICAgIG11c3Q6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBib29sOiB7XG4gICAgICAgICAgICAgIHNob3VsZDogW1xuICAgICAgICAgICAgICAgIHsgbWF0Y2g6IHsgc3RhZ2VfbmFtZTogc2VhcmNoVGV4dCB9IH0sXG4gICAgICAgICAgICAgICAgeyBwcmVmaXg6IHsgc3RhZ2VfbmFtZTogbGFzdFdvcmQgfSB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIF0sXG5cbiAgICAgICAgZmlsdGVyOiB7XG4gICAgICAgICAgbWF0Y2g6IHtcbiAgICAgICAgICAgIHR5cGU6IFwiYXJ0aXN0XCJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgbGV0IHJlc3VsdHMgPSBbXTtcblxuICAgIHZhciByZXN1bHQgPSBhd2FpdCBjbGllbnQuc2VhcmNoKHtcbiAgICAgIGluZGV4OiBcImRhdGFiYXNlMVwiLFxuICAgICAgYm9keTogeyBxdWVyeTogcXVlcnkgfVxuICAgIH0pO1xuICAgIHZhciB3b3cgPSByZXN1bHQuaGl0cy5oaXRzLm1hcChmdW5jdGlvbiAoeyBfaWQsIC4uLm5vbnNlbnNlIH0sIGluZGV4KSB7XG5cbiAgICAgIHJldHVybiBfaWQ7XG4gICAgfSk7XG4gICAgcmV0dXJuIE1ldGVvci5jYWxsKFwiZ2V0X2FydGlzdHNcIiwgd293KTtcbiAgfSxcbiAgc2VhcmNoX3BsYXlsaXN0cyhzZWFyKSB7XG4gICAgaWYgKCFzZWFyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHZhciBwbGF5bGlzdHMgPSBQbGF5bGlzdHMuZmluZChcbiAgICAgIHtcbiAgICAgICAgJHRleHQ6IHsgJHNlYXJjaDogc2VhciB9LFxuICAgICAgICB2ZXJpZmllZDogdHJ1ZSxcbiAgICAgICAgcHVibGljOiB0cnVlLFxuICAgICAgICBfaWQ6IHsgJG5lOiBcImhvdHRyYWNrc3VhXCIgfVxuICAgICAgfSxcbiAgICAgIHsgZmllbGRzOiB7IF9pZDogMSB9IH1cbiAgICApLmZldGNoKCk7XG4gICAgcGxheWxpc3RzLmZvckVhY2goKGUsIGkpID0+IHtcbiAgICAgIHJlc3VsdHMucHVzaChNZXRlb3IuY2FsbChcInJldHVyblBsYXlsaXN0XCIsIGUuX2lkKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cbn0pO1xuIiwiY29uc3QgVVNFUiA9IHtcbiAgICBfaWQ6IFwiXCIsXG59XG4iLCJpbXBvcnQgeyBBcnRpc3RzLCBBbGJ1bXMsIFRyYWNrcyB9IGZyb20gXCIuLi9pbXBvcnRzL2FwaS9jb2xsZWN0aW9uc1wiO1xuXG52YXIgZWxhc3RpY3NlYXJjaCA9IE5wbS5yZXF1aXJlKFwiZWxhc3RpY3NlYXJjaFwiKTtcbnZhciBjbGllbnQgPSBuZXcgZWxhc3RpY3NlYXJjaC5DbGllbnQoe1xuICBob3N0OiBcIjE5Mi4xNjguMzEuNTA6OTIwMFwiXG4gIC8vIGxvZzogJ3RyYWNlJ1xufSk7XG5hc3luYyBmdW5jdGlvbiBwdXRNYXBwaW5nKCkge1xuICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIE1hcHBpbmcgaW5kZXhcIik7XG4gIGNsaWVudC5pbmRpY2VzLmNyZWF0ZShcbiAgICB7XG4gICAgICBpbmRleDogXCJkYXRhYmFzZTFcIixcbiAgICAgIGJvZHk6IHtcbiAgICAgICAgbWFwcGluZ3M6IHtcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBzdGFnZV9uYW1lOiB7XG4gICAgICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgICAgICBrZXl3b3JkOiB7IHR5cGU6IFwia2V5d29yZFwiIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdlbnJlczoge1xuICAgICAgICAgICAgICB0eXBlOiBcImtleXdvcmRcIixcbiAgICAgICAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgICAgICAgdGV4dDoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogXCJ0ZXh0XCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjcmVhdGVkX29uOiB7IHR5cGU6IFwiZGF0ZVwiIH0sXG4gICAgICAgICAgICB0eXBlOiB7IHR5cGU6IFwia2V5d29yZFwiIH0sXG4gICAgICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgICAgICBrZXl3b3JkOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBcImtleXdvcmRcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZlYXR1cmluZ19hcnRpc3RzOiB7XG4gICAgICAgICAgICAgIHR5cGU6IFwibmVzdGVkXCIsXG4gICAgICAgICAgICAgIGluY2x1ZGVfaW5fcGFyZW50OiB0cnVlLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgX2lkOiB7IHR5cGU6IFwia2V5d29yZFwiIH0sXG4gICAgICAgICAgICAgICAgc3RhZ2VfbmFtZToge1xuICAgICAgICAgICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgICAgICAgICAga2V5d29yZDoge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwia2V5d29yZFwiXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhcnRpc3RzOiB7XG4gICAgICAgICAgICAgIGluY2x1ZGVfaW5fcGFyZW50OiB0cnVlLFxuICAgICAgICAgICAgICB0eXBlOiBcIm5lc3RlZFwiLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgX2lkOiB7IHR5cGU6IFwia2V5d29yZFwiIH0sXG4gICAgICAgICAgICAgICAgc3RhZ2VfbmFtZToge1xuICAgICAgICAgICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgICAgICAgICAga2V5d29yZDoge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwia2V5d29yZFwiXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgICAgICBrZXl3b3JkOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBcImtleXdvcmRcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsYnVtOiB7XG4gICAgICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgICAgICBrZXl3b3JkOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBcImtleXdvcmRcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsYnVtX2lkOiB7IHR5cGU6IFwia2V5d29yZFwiIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIChlcnIsIHJlc3AsIHN0YXR1cykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVyciwgc3RhdHVzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiU3VjY2Vzc2Z1bGx5IENyZWF0ZWQgSW5kZXhcIiwgc3RhdHVzLCByZXNwKTtcbiAgICAgIH1cbiAgICB9XG4gICk7XG59XG4vKlxuY2xpZW50LmluZGljZXMucHV0TWFwcGluZyh7XG4gIGluZGV4OiBcImRhdGFiYXNlXCIsXG4gIGJvZHk6IHtcbiAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICBuYW1lOiB7XG4gICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICBrZXl3b3JkOiB7XG4gICAgICAgICAgICB0eXBlOiBcInRleHRcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG5cbiovXG5cbi8vcHV0TWFwcGluZygpO1xuLypjbGllbnQucmVpbmRleCh7XG4gIGJvZHk6IHtcbiAgICBjb25mbGljdHM6IFwicHJvY2VlZFwiLFxuICAgIHNvdXJjZTogeyBpbmRleDogXCJuZWxpc3RlblwiIH0sXG4gICAgZGVzdDogeyBpbmRleDogXCJsaXN0ZW4yXCIgfVxuICB9XG59KTtcbiovXG52YXIgRklFTERTX1RPX0lOQ0xVREUgPSBbXCJfaWRcIiwgXCJzdGFnZV9uYW1lXCIsIFwiZ2VucmVzXCJdO1xuXG5jb25zdCBhbGJ1bXMgPSBBbGJ1bXMuZmluZChcbiAge30sXG4gIHsgZmllbGRzOiB7IG5hbWU6IDEsIGdlbnJlczogMSwgdHlwZTogMSwgYWRkZWRfYXQ6IDEsIGFydGlzdHM6IDEgfSB9XG4pLmZldGNoKCk7XG5jb25zdCBhcnRpID0gQXJ0aXN0cy5maW5kKFxuICB7fSxcbiAgeyBmaWVsZHM6IHsgc3RhZ2VfbmFtZTogMSwgdHlwZTogMSwgZ2VucmVzOiAxLCBjcmVhdGVkX29uOiAxIH0gfVxuKS5mZXRjaCgpO1xuY29uc3QgdHJhY2tzID0gVHJhY2tzLmZpbmQoXG4gIHt9LFxuICB7XG4gICAgZmllbGRzOiB7XG4gICAgICB0aXRsZTogMSxcbiAgICAgIHR5cGU6IDEsXG4gICAgICBhbGJ1bTogMSxcbiAgICAgIGdlbnJlczogMSxcbiAgICAgIGZlYXR1cmluZ19hcnRpc3RzOiAxLFxuICAgICAgYWRkZWRfYXQ6IDFcbiAgICB9XG4gIH1cbik7XG5hc3luYyBmdW5jdGlvbiBydW4oKSB7XG4gIGFsYnVtcy5mb3JFYWNoKChlbCwgaW5kZXgpID0+IHtcbiAgICBpZCA9IGVsLl9pZDtcbiAgICBkZWxldGUgZWwuX2lkO1xuICAgIGVsLnR5cGUgPSBcImFsYnVtXCI7XG4gICAgZWwuY3JlYXRlZF9vbiA9IGVsLmFkZGVkX2F0O1xuXG4gICAgZWwuYXJ0aXN0cyA9IGVsLmFydGlzdHMubWFwKChlbCwgaW5kKSA9PiB7XG4gICAgICByZXR1cm4gQXJ0aXN0cy5maW5kT25lKHsgX2lkOiBlbCB9LCB7IGZpZWxkczogeyBzdGFnZV9uYW1lOiAxIH0gfSk7XG4gICAgfSk7XG4gICAgZGVsZXRlIGVsLmFkZGVkX2F0O1xuXG4gICAgY2xpZW50LmluZGV4KFxuICAgICAge1xuICAgICAgICBpZDogaWQsXG4gICAgICAgIGluZGV4OiBcImRhdGFiYXNlMVwiLFxuICAgICAgICB0eXBlOiBcIl9kb2NcIixcbiAgICAgICAgYm9keTogZWxcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgIH1cbiAgICApO1xuICB9KTtcbiAgYXJ0aS5mb3JFYWNoKChlbCwgaW5kZXgpID0+IHtcbiAgICBpZCA9IGVsLl9pZDtcbiAgICBkZWxldGUgZWwuX2lkO1xuICAgIGVsLmNyZWF0ZWRfb24gPSBuZXcgRGF0ZShcIjIwMTktMDMtMDFcIik7XG4gICAgZWwudHlwZSA9IFwiYXJ0aXN0XCI7XG5cbiAgICBjbGllbnQuaW5kZXgoXG4gICAgICB7XG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgaW5kZXg6IFwiZGF0YWJhc2UxXCIsXG4gICAgICAgIHR5cGU6IFwiX2RvY1wiLFxuICAgICAgICBib2R5OiBlbFxuICAgICAgfSxcbiAgICAgIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIldlbGwgZG9uZVwiKTtcbiAgICAgIH1cbiAgICApO1xuICB9KTtcblxuICB0cmFja3MuZm9yRWFjaCgoZWwsIGluZGV4KSA9PiB7XG4gICAgaWQgPSBlbC5faWQ7XG4gICAgZGVsZXRlIGVsLl9pZDtcbiAgICBlbC5jcmVhdGVkX29uID0gZWwuYWRkZWRfYXQ7XG4gICAgZWwudHlwZSA9IFwidHJhY2tcIjtcbiAgICBlbC5hbGJ1bV9pZCA9IGVsLmFsYnVtO1xuICAgIGxldCBhbCA9IEFsYnVtcy5maW5kT25lKFxuICAgICAgeyBfaWQ6IGVsLmFsYnVtX2lkIH0sXG4gICAgICB7IGZpZWxkczogeyBuYW1lOiAxLCBfaWQ6IDAsIGFydGlzdHM6IDEgfSB9XG4gICAgKTtcbiAgICBlbC5hbGJ1bSA9IGFsLm5hbWU7XG5cbiAgICBlbC5hcnRpc3RzID0gYWwuYXJ0aXN0cy5tYXAoKGVsLCBpbmQpID0+IHtcbiAgICAgIHJldHVybiBBcnRpc3RzLmZpbmRPbmUoXG4gICAgICAgIHsgX2lkOiBlbCB9LFxuICAgICAgICB7IGZpZWxkczogeyBzdGFnZV9uYW1lOiAxLCBfaWQ6IDEgfSB9XG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgZWwuZmVhdHVyaW5nX2FydGlzdHMgPSBlbC5mZWF0dXJpbmdfYXJ0aXN0cy5tYXAoKGVsLCBpbmQpID0+IHtcbiAgICAgIHJldHVybiBBcnRpc3RzLmZpbmRPbmUoXG4gICAgICAgIHsgX2lkOiBlbCB9LFxuICAgICAgICB7IGZpZWxkczogeyBzdGFnZV9uYW1lOiAxLCBfaWQ6IDEgfSB9XG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgZGVsZXRlIGVsLmZlYXR1cmluZ19hcnRpc3RzO1xuICAgIGRlbGV0ZSBlbC5hZGRlZF9hdDtcblxuICAgIGNsaWVudC5pbmRleChcbiAgICAgIHtcbiAgICAgICAgaWQ6IGlkLFxuICAgICAgICBpbmRleDogXCJkYXRhYmFzZTFcIixcbiAgICAgICAgdHlwZTogXCJfZG9jXCIsXG4gICAgICAgIGJvZHk6IGVsXG4gICAgICB9LFxuICAgICAgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiVHJhY2sgQWRkZWRcIik7XG4gICAgICB9XG4gICAgKTtcbiAgfSk7XG59XG4vL3J1bigpLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZyh7IGVyciB9KSk7XG4iLCIvLyBTZXJ2ZXIgZW50cnkgcG9pbnQsIGltcG9ydHMgYWxsIHNlcnZlciBjb2RlXG5pbXBvcnQgXCIvaW1wb3J0cy9zdGFydHVwL3NlcnZlclwiO1xuaW1wb3J0IFwiL2ltcG9ydHMvc3RhcnR1cC9ib3RoXCI7XG5pbXBvcnQgeyBNb25nb0ludGVybmFscyB9IGZyb20gXCJtZXRlb3IvbW9uZ29cIjtcbmNvbnN0IEJ1c2JveSA9IE5wbS5yZXF1aXJlKFwiYnVzYm95XCIpO1xuY29uc3QgcmVxdWVzdCA9IHJlcXVpcmUoXCJyZXF1ZXN0XCIpO1xudHJ5IHtcbiAgY29uc3QgZGIxID0gbmV3IE1vbmdvSW50ZXJuYWxzLlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIoXG4gICAgTWV0ZW9yLnNldHRpbmdzLmFjY291bnRzREIgPyBNZXRlb3Iuc2V0dGluZ3MuYWNjb3VudHNEQi51cmwgOiBcIm1vbmdvZGI6Ly9sb2NhbGhvc3Q6MzAwNi9tZXRlb3JcIlxuICAgICwge1xuICAgICAgcmVjb25uZWN0VHJpZXM6IDEyMCxcbiAgICAgIHJlY29ubmVjdEludGVydmFsOiAxMDAwMCxcbiAgICB9XG4gICk7XG59IGNhdGNoIChlKSB7XG5cbn1cbi8qXG5cbmNvbnN0IGRiMSA9IG5ldyBNb25nb0ludGVybmFscy5SZW1vdGVDb2xsZWN0aW9uRHJpdmVyKFxuICBcIm1vbmdvZGIrc3J2Oi8vdGhlbmVpZ2hib3Job29kOk51Y2IxYkJCYUd0YlZpZzlAY2x1c3RlcjAtbHI2M3IuZ2NwLm1vbmdvZGIubmV0L3RoZW5laWdoYm9yaG9vZD9yZXRyeVdyaXRlcz10cnVlJnc9bWFqb3JpdHlcIlxuKTtcblxuKi9cblxuaW1wb3J0IHsgTWFya2V0cywgQWxidW1zIH0gZnJvbSBcIi9pbXBvcnRzL2FwaS9jb2xsZWN0aW9ucy5qc1wiO1xuaW1wb3J0IHsgVHJhY2tzLCBHZW5yZXMgfSBmcm9tIFwiLi4vaW1wb3J0cy9hcGkvY29sbGVjdGlvbnMuanNcIjtcblxudmFyIHJlZ2lvbjtcbk1ldGVvci5wdWJsaXNoKFwiZmxvd1N0YXJ0XCIsICgpID0+IHtcbiAgcmVnaW9uID0gXCJVQVwiO1xuICByZXR1cm4gW01hcmtldHMuZmluZCgpXTtcbn0pO1xuTWV0ZW9yLnB1Ymxpc2goXCJtYXJrZXRzXCIsICgpID0+IHtcbiAgcmV0dXJuIE1hcmtldHMuZmluZCh7fSk7XG59KTtcblxuTWV0ZW9yLm9uQ29ubmVjdGlvbihlID0+IHsgfSk7XG5cbk1ldGVvci5tZXRob2RzKHtcbiAgY3JlYXRlQWNjb3VudCh1c2VySWQpIHtcbiAgICBpZiAoTWV0ZW9yLnVzZXJzLmZpbmRPbmUoeyB0bmlkOiB1c2VySWQgfSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdXNlciA9IHt9O1xuICAgIHVzZXJbXCJ0bmlkXCJdID0gdXNlcklkO1xuICAgIHVzZXJbXCJyZWNlbnRseV9wbGF5ZWRcIl0gPSBbXTtcbiAgICB1c2VyW1wic2V0dGluZ3NcIl0gPSB7fTtcbiAgICB1c2VyW1wiZmF2b3JpdGVzXCJdID0gW107XG4gICAgdXNlcltcImxpYnJhcnlcIl0gPSBbXTtcblxuICAgIHVzZXJbXCJjcmVhdGVkX2F0XCJdID0gbmV3IERhdGUoKTtcbiAgICB1c2VyW1wibGlrZXNcIl0gPSBbXTtcblxuICAgIHJldHVybiBNZXRlb3IudXNlcnMuaW5zZXJ0KHVzZXIsIGZ1bmN0aW9uIChlcnIsIHIpIHtcbiAgICAgIGlmIChlcnIpIHtcblxuICAgICAgfVxuICAgIH0pO1xuICB9XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goXCJ1c2VyXCIsIGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgcmV0dXJuIE1ldGVvci51c2Vycy5maW5kKHsgX2lkOiB0aGlzLnVzZXJJZCB9LCB7IGZpZWxkczogeyBzZXJ2aWNlczogMCB9IH0pO1xuICB9XG59KTtcblxuV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoXCIvYXBpL2dlbnJlc1wiLCBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2phdmFzY3JpcHRcIik7XG4gIGxldCBnciA9IEdlbnJlcy5maW5kKCkuZmV0Y2goKTtcbiAgLy9yZXMuc3RhdHVzQ29kZSA9IDQwMTtcbiAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShncikpO1xuICAvLyAgbmV4dCgpXG59KTtcblxuV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoXCIvdXBsb2FkdHJhY2tcIiwgZnVuY3Rpb24gKHJlcSwgcmVzLCBuZXh0KSB7XG4gIGNvbnNvbGUubG9nKHJlcS51cmwpO1xuXG4gIGlmIChyZXEubWV0aG9kLnRvTG93ZXJDYXNlKCkgPT0gXCJwb3N0XCIpIHtcbiAgICB2YXIgYnVzYm95ID0gbmV3IEJ1c2JveSh7IGhlYWRlcnM6IHJlcS5oZWFkZXJzIH0pO1xuICAgIGJ1c2JveS5vbihcImZpbGVcIiwgZnVuY3Rpb24gKGZpZWxkbmFtZSwgZmlsZSwgZmlsZW5hbWUsIGVuY29kaW5nLCBtaW1ldHlwZSkge1xuICAgICAgdmFyIGlkID0gbWFrZWlkKDEwKTtcbiAgICAgIHZhciBjbG91ZGluYXJ5X3N0cmVhbSA9IGNsb3VkaW5hcnkudjIudXBsb2FkZXIudXBsb2FkX3N0cmVhbShcbiAgICAgICAgeyByZXNvdXJjZV90eXBlOiBcImF1dG9cIiwgcHVibGljX2lkOiBpZCwgZm9sZGVyOiBcInJlbGVhc2VzXCIgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVyciwgaW1hKSB7XG5cbiAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGltYSkpO1xuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgICBmaWxlLm9uKFwiZGF0YVwiLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBjbG91ZGluYXJ5X3N0cmVhbS53cml0ZShkYXRhKTtcbiAgICAgIH0pO1xuICAgICAgZmlsZS5vbihcImVuZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNsb3VkaW5hcnlfc3RyZWFtLmVuZCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmVxLnBpcGUoYnVzYm95KTtcbiAgfSBlbHNlIHtcbiAgICBuZXh0KCk7XG4gIH1cbn0pO1xuV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoXCIvdXBsb2FkL1wiLCBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgaWYgKHJlcS51cmwgPT0gXCIvY292ZXJcIikge1xuICAgIG5leHQoKTtcbiAgfVxuICBpZiAocmVxLm1ldGhvZC50b0xvd2VyQ2FzZSgpID09IFwicG9zdFwiKSB7XG4gICAgdmFyIGJ1c2JveSA9IG5ldyBCdXNib3koeyBoZWFkZXJzOiByZXEuaGVhZGVycyB9KTtcblxuICAgIGJ1c2JveS5vbihcImZpbGVcIiwgZnVuY3Rpb24gKGZpZWxkbmFtZSwgZmlsZSwgZmlsZW5hbWUsIGVuY29kaW5nLCBtaW1ldHlwZSkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ0ZpbGUgWycgKyBmaWVsZG5hbWUgKyAnXTogZmlsZW5hbWU6ICcgKyBmaWxlbmFtZSArICcsIGVuY29kaW5nOiAnICsgZW5jb2RpbmcgKyAnLCBtaW1ldHlwZTogJyArIG1pbWV0eXBlKTtcbiAgICAgIHZhciBpZCA9IG1ha2VpZCgxMCk7XG5cbiAgICAgIHZhciBjbG91ZGluYXJ5X3N0cmVhbSA9IGNsb3VkaW5hcnkudjIudXBsb2FkZXIudXBsb2FkX3N0cmVhbShcbiAgICAgICAgeyByZXNvdXJjZV90eXBlOiBcImF1dG9cIiwgcHVibGljX2lkOiBpZCwgZm9sZGVyOiBcInVwbG9hZHNcIiB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyLCBpbWEpIHtcbiAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGltYSkpO1xuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgICBmaWxlLm9uKFwiZGF0YVwiLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBjbG91ZGluYXJ5X3N0cmVhbS53cml0ZShkYXRhKTtcbiAgICAgIH0pO1xuICAgICAgZmlsZS5vbihcImVuZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNsb3VkaW5hcnlfc3RyZWFtLmVuZCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXEucGlwZShidXNib3kpO1xuICB9IGVsc2Uge1xuICAgIG5leHQoKTtcbiAgfVxufSk7XG5cbldlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKFwiL3VwbG9hZC9jb3ZlclwiLCBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcblxuICBpZiAocmVxLm1ldGhvZC50b0xvd2VyQ2FzZSgpID09IFwicG9zdFwiKSB7XG4gICAgdmFyIGJ1c2JveSA9IG5ldyBCdXNib3koeyBoZWFkZXJzOiByZXEuaGVhZGVycyB9KTtcbiAgICBidXNib3kub24oXCJmaWxlXCIsIGZ1bmN0aW9uIChmaWVsZG5hbWUsIGZpbGUsIGZpbGVuYW1lLCBlbmNvZGluZywgbWltZXR5cGUpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdGaWxlIFsnICsgZmllbGRuYW1lICsgJ106IGZpbGVuYW1lOiAnICsgZmlsZW5hbWUgKyAnLCBlbmNvZGluZzogJyArIGVuY29kaW5nICsgJywgbWltZXR5cGU6ICcgKyBtaW1ldHlwZSk7XG4gICAgICB2YXIgaWQgPSBtYWtlaWQoMTApO1xuICAgICAgdmFyIGNsb3VkaW5hcnlfc3RyZWFtID0gY2xvdWRpbmFyeS52Mi51cGxvYWRlci51cGxvYWRfc3RyZWFtKFxuICAgICAgICB7IHJlc291cmNlX3R5cGU6IFwiYXV0b1wiLCBwdWJsaWNfaWQ6IGlkLCBmb2xkZXI6IFwiL3JlbGVhc2VzL2NvdmVyYXJ0c1wiIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIsIGltYSkge1xuICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoaW1hKSk7XG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIGZpbGUub24oXCJkYXRhXCIsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGNsb3VkaW5hcnlfc3RyZWFtLndyaXRlKGRhdGEpO1xuICAgICAgICAvLyAgICBjb25zb2xlLmxvZygnRmlsZSBbJyArIGZpZWxkbmFtZSArICddIGdvdCAnICsgZGF0YS5sZW5ndGggKyAnIGJ5dGVzJyk7XG4gICAgICB9KTtcbiAgICAgIGZpbGUub24oXCJlbmRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICBjbG91ZGluYXJ5X3N0cmVhbS5lbmQoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmVxLnBpcGUoYnVzYm95KTtcbiAgfSBlbHNlIHtcbiAgICBuZXh0KCk7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBtYWtlaWQobGVuZ3RoKSB7XG4gIHZhciByZXN1bHQgPSBcIlwiO1xuICB2YXIgY2hhcmFjdGVycyA9XG4gICAgXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OVwiO1xuICB2YXIgY2hhcmFjdGVyc0xlbmd0aCA9IGNoYXJhY3RlcnMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgcmVzdWx0ICs9IGNoYXJhY3RlcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNMZW5ndGgpKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19
