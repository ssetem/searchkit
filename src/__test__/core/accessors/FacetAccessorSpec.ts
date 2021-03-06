import {
  FacetAccessor, ImmutableQuery, Searcher,
  BoolMust, BoolShould, ArrayState
} from "../../../"
import * as _ from "lodash"

describe("FacetAccessor", ()=> {

  beforeEach(()=> {
    this.options = {
      operator:"OR",
      title:"Genres",
      id:"GenreId",
      size:20
    }
    this.searcher = new Searcher(null)
    this.accessor = new FacetAccessor("genre", this.options)
    this.accessor.setSearcher(this.searcher)
  })

  it("constructor()", ()=> {
    expect(this.accessor.options).toBe(this.options)
    expect(this.accessor.urlKey).toBe("GenreId")
    expect(this.accessor.key).toBe("genre")
  })

  it("getBuckets()", ()=> {
    expect(this.accessor.getBuckets()).toEqual([])
    this.searcher.results = {
      aggregations:{
        genre:{
          genre:{buckets:[1,2]}
        }
      }
    }
    expect(this.accessor.getBuckets())
      .toEqual([1,2])
  })

  it("isOrOperator()", ()=> {
    expect(this.accessor.isOrOperator())
      .toBe(true)
    this.options.operator = "AND"
    expect(this.accessor.isOrOperator())
      .toBe(false)
  })

  it("getBoolBuilder()", ()=> {
    expect(this.accessor.getBoolBuilder())
      .toBe(BoolShould)
    this.options.operator = "AND"
    expect(this.accessor.getBoolBuilder())
      .toBe(BoolMust)
  })

  describe("view more options", () => {
    beforeEach(()=> {
      this.searcher.translate = (key)=> {
        return {
          "view more":"View more", "view less":"View less",
          "view all":"View all"
        }[key]
      }
    })

    it("setViewMoreOption", () => {
      this.accessor.setViewMoreOption({size:30})
      expect(this.accessor.size).toBe(30)
    })

    it("getMoreSizeOption - view more", () => {
      this.accessor.getCount = () => {
        return 100
      }
      expect(this.accessor.getMoreSizeOption()).toEqual({size:70, label:"View more"})
    })

    it("getMoreSizeOption - view all", () => {
      this.accessor.getCount = () => {
        return 30
      }
      expect(this.accessor.getMoreSizeOption()).toEqual({size:30, label:"View all"})
    })

    it("getMoreSizeOption - view less", () => {
      this.accessor.getCount = () => {
        return 30
      }
      this.accessor.size = 30
      expect(this.accessor.getMoreSizeOption()).toEqual({size:20, label:"View less"})
    })

    it("getMoreSizeOption - no option", () => {
      this.accessor.getCount = () => {
        return 15
      }
      this.accessor.size = 20
      expect(this.accessor.getMoreSizeOption()).toEqual(null)
    })
  })

  describe("buildSharedQuery", ()=> {
    beforeEach(()=> {
      this.searcher.translate = (key)=> {
        return {
          "1":"Games", "2":"Action",
          "3":"Comedy", "4":"Horror"
        }[key]
      }
      this.toPlainObject = (ob)=> {
        return JSON.parse(JSON.stringify(ob))
      }
      this.accessor.state = new ArrayState([
        "1", "2"
      ])
      this.query = new ImmutableQuery()
    })

    it("filter test", ()=> {
      this.query = this.accessor.buildSharedQuery(this.query)
      let filters = this.query.getFilters().$array[0].$array
      expect(this.toPlainObject(filters)).toEqual([
        {
          "term": {
            "genre": "1"
          },
          "$disabled": false,
          "$name": "Genres",
          "$value": "Games",
          "$id": "GenreId"
        },
        {
          "term": {
            "genre": "2"
          },
          "$disabled": false,
          "$name": "Genres",
          "$value": "Action",
          "$id": "GenreId"
        }
      ])

      filters[0].$remove()
      expect(this.accessor.state.getValue()).toEqual(["2"])
      filters[1].$remove()
      expect(this.accessor.state.getValue()).toEqual([])
      expect(this.query.getFilters().$array[0].bool.should).toBeTruthy()
    })

    it("AND filter", ()=> {
      this.options.operator = "AND"
      this.query = this.accessor.buildSharedQuery(this.query)
      expect(this.query.getFilters().$array[0].bool.should).toBeFalsy()
      expect(this.query.getFilters().$array[0].bool.must).toBeTruthy()
    })

    it("Empty state", ()=> {
      this.accessor.state = new ArrayState([])
      let query = this.accessor.buildSharedQuery(this.query)
      expect(query).toBe(this.query)
    })

  })

  describe("buildOwnQuery", ()=> {

    beforeEach(()=> {

      this.accessor.state = new ArrayState([
        "1", "2"
      ])
      this.query = new ImmutableQuery()
        .addFilter("rating", BoolShould(["PG"]))
        .addFilter("genre", BoolShould(["1", "2"]))
    })

    it("build own query - or", ()=> {
      let query = this.accessor.buildOwnQuery(this.query)
      expect(query.getJSON().aggs).toEqual({
        "genre_count": {
          "filter": {
            "bool": {
              "must": [{
                "bool": {
                  "should": ["PG"]
                }
              }]
            }
          },
          "aggs": {
            "genre_count": {
              "cardinality": {
                "field": "genre"
              }
            }
          }
        },
        "genre": {
          "filter": {
            "bool": {
              "must": [{
                "bool": {
                  "should": ["PG"]
                }
              }]
            }
          },
          "aggs": {
            "genre": {
              "terms": {
                "field": "genre",
                "size": 20
              }
            }
          }
        }
      })
    })

    it("build own query - and", ()=> {
      this.options.operator = "AND"
      let query = this.accessor.buildOwnQuery(this.query)
      expect(query.getJSON().aggs).toEqual({
        "genre_count": {
          "filter": {
            "bool": {
              "must": [{
                "bool": {
                  "should": ["PG"]
                }
              },
              {
                "bool":{
                  "should":["1", "2"]
                }
              }]
            }
          },
          "aggs": {
            "genre_count": {
              "cardinality": {
                "field": "genre"
              }
            }
          }
        },
        "genre": {
          "filter": {
            "bool": {
              "must": [{
                "bool": {
                  "should": ["PG"]
                }
              },
              {
                "bool":{
                  "should":["1", "2"]
                }
              }]
            }
          },
          "aggs": {
            "genre": {
              "terms": {
                "field": "genre",
                "size": 20
              }
            }
          }
        }
      })
    })


  })


})
