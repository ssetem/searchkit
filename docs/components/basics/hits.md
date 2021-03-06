# Hits Component
Hits component displays results from ElasticSearch. To customise each result, you need to override the `renderResult` method.
The method will receive a single `hit` object from the search results, which will include `result._source` which contains the untouched stored fields which were indexed.

## Example Usage

```jsx

import {
  Hits,
  SearchkitComponent
} from "searchkit";

class MovieHits extends Hits {
  renderResult(result:any) {
    return (
      <div className="hit" key={result._id}>
        <img className="hit__poster" src={result._source.poster}/>
        <div className="hit__title">{result._source.title}</div>
      </div>
    )
  }
}

class App extends SearchkitComponent<any, any> {

  render(){
    <div>
      <MovieHits hitsPerPage={50}/>
    </div>
  }
}
```

## Props
- `hitsPerPage` *(Number)*: Number of results displayed per page

## Customising Blank States

Often the hits component will display the appropriate blank states, `renderInitialView` and `renderNoResults` can be overriden to provide custom behaviour, below is the default implementation

```jsx
class MovieHits extends Hits {
  //...
  renderInitialView() {
    return (
	  <div className={this.bemBlocks.container("initial-loading")}></div>
	)
  }
  renderNoResults() {
    return (
	  <div className={this.bemBlocks.container("no-results")}>No results</div>
	)
  }
}
```

## Demo
[](codepen://searchkit/vLgLOw?height=800&theme=0)
