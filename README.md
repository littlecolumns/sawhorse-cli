# sawhorse-cli

## Creating a new project

```
sawhorse create my-project
```

```
sawhorse create my-project -T [folder,path,url]
```

## Updating an existing project

```
cd my-project
sawhorse import -T [folder,path,url] --include [folders,paths]
```

* If specified, only updates top-level elements matching `--include``.

## Creating a template

```
cd my-project
sawhorse generate --include [glob list] --output [filename]
```

## For example

```
sawhorse create my-project -T /path/to/template_folder
```

```
sawhorse create my-project -T /path/to/template.zip
```

```
sawhorse create my-project -T http://example.com/template.zip
```

```
sawhorse import -T http://example.com/template.zip --include README.md,html
```

```
sawhorse generate --include src/**,README.md,tests/** --output hw-template.zip
```

```
sawhorse generate --include src/**,README.md,tests/** --output hw-template.zip
```