# Meerkat

![pkgsite](https://pkg.go.dev/badge/github.com/meerkat-dashboard/meerkat)

Meerkat is a utility to create and share dashboards for Icinga 2 checks and hosts. It is comprised of a lightweight Go server and a browser front-end written in Preact. It's quick to setup and easy to use.

**Not developing Meerkat?** See the Meerkat website at https://meerkat.run

## Development

Meerkat development requires supported releases of Go and Node.js.
See the [Go installation][goinstall] and [Node.js install][nodeinstall] documentation.
Devolopment with older toolchains may be ok but we can't guarantee the behaviour.

### Quickstart

A typical workflow involves starting a filesystem watcher to rebuild the UI on changes:

	cd ui
	npm run dev

Then run another command to start meerkat with `go run`:

	go run ./cmd/meerkat -ui ui

The ui flag sets meerkat to serve the UI bundle from the ui directory.
This means subsequent changes to the UI will be served without
requiring a rebuild of the entire command.

For more detail on each stage, keep reading.

### Development workflow

Another workflow involves running local test suites,
then building and running the program for manual testing.

As before, start by installing javascript dependencies:

	cd ui
	npm ci

Throughout development, tests can be run via `go test`.
This includes Javascript tests.
To run all tests:

	go test ./...

Finally, build the UI and the server and run meerkat:

	cd ui
	npm run build
	cd ../cmd/meerkat
	go build
	./meerkat

By default, meerkat listens on the address http://127.0.0.1:8080.
Open meerkat and have a click around!

For command usage, see [cmd/meerkat].
For a configuration file reference, see [Configuration].

[Configuration]: https://meerkat.run/configuration
[goinstall]: https://go.dev/doc/install
[nodeinstall]: https://nodejs.org/en/download/package-manager/
[cmd/meerkat]: https://godocs.io/github.com/meerkat-dashboard/meerkat/cmd/meerkat

### Contributing

#### Test

Before submitting a change, ensure code is formatted:

	go fmt
	cd ui
	npm run lint

Run all the tests from the root of the project:

	go test ./...

#### Commit message

Commit messages follow the same format used by the [Go] project (among others).
The commit subject starts with the affected package name then a brief description of the change.
The body may contain an explanation of the change and why it was made.
See commit 4603601 for an example.

[Go]: https://go.dev/doc/contribute#commit_messages

## Configuring Icinga

Meerkat communicates with Icinga via its HTTP API.
This requires authentication.
Here is an example `ApiUser` object with limited, read-only privileges:

	object ApiUser "meerkat" {
		password = "meerkat"
		permissions = [ "objects/query/Host", "objects/query/Service", "objects/query/ServiceGroup", "objects/query/HostGroup" ]
	}

In a default Icinga2 installation, you can write this definition to `/etc/icinga2/conf.d/api-users.conf`.

## Support

Sol1 is an official Icinga Enterprise Partner, and can offer commercial support for Meerkat and Icinga and friends. We are a friendly bunch of people, so please don't hesitate to get in touch at https://sol1.com.au.

### Contributing
We welcome any contributions. Let us know via the issues here if there is something you need fixed up, or even better, a patch or PR would be most appreciated.

[Sounds from Notification Sounds](https://www.notificationsounds.com) provided under the creative commons 4.0 license

License is GNU Affero GPLv3.
