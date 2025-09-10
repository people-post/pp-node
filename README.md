# pp-node
For personal data hosting

```mermaid
graph TD;
    USER((User)):::User-- New post -->THIS(Personal node):::Server;
    linkStyle 0 color:salmon;
    classDef User color:blue;
    classDef Server fill:salmon,color:white;
```

## API references
### Host
#### GET `api/host/info`
- Query:
`id`: string, required.

- Return: 
```
{
  info: {
    is_register_enabled: false, # true/false,
    is_reclaim_enabled: false,  # true/false,
    peer_id: ""
  }
}
```
### User
#### GET `api/user/get`
- Query:
`id`: string, required.

- Return: 
```
{
  user: {
    id: <user_id>,
    name: <user_name>,
    public_key: <user_public_key>
  }
}
```

#### GET `api/user/list`
- Return:
```
{
  users: []  # Items are users with same format as above
}
```

#### POST `api/user/register`
- Content-Type: `application/json`

#### POST `api/user/update`
- Content-Type: `application/json`

### Upload
#### GET `api/upload/token`
- Return:
```
{
  token: <token>
}
```

#### POST `api/upload/file`
- Content-Type: `multipart/form-data`
- Return:
```
{
  cid: <cid>
}
```

#### POST `api/upload/image`
- Content-Type: `multipart/form-data`

#### POST `api/upload/video`
- Content-Type: `multipart/form-data`

#### POST `api/upload/json`
- Content-Type: `application/json`
- Body:
  `data`:
  `id`:
  `signature`:
- Return:
```
{
  cid: <cid>
}
```

### Pin
#### POST `api/pin/add`
- Content-Type: `application/json`
