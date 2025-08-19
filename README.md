# personal-node
For personal data hosting

```mermaid
graph TD;
    USER((User)):::User-- New post -->THIS(Pinning server):::Server;
    linkStyle 0 color:salmon;
    classDef User color:blue;
    classDef Server fill:salmon,color:white;
```

## API references
#### POST `api/file/upload`
- Content-Type: `multipart/form-data`

#### POST `api/json/upload`
- Content-Type: `application/json`

#### POST `api/pin/update`
- Content-Type: `application/json`
