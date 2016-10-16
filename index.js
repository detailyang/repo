'use strict';


const argv = require('optimist').argv;
const GitHubApi = require("github");
const co = require("co");

function help() {
    console.log(`
repo --username xx --password yy
`);
}

const github = new GitHubApi({
    debug: false,
    protocol: "https",
    host: "api.github.com",
    headers: {
        "user-agent": "https://github.com/detailyang/repo"
    },
    Promise: require('bluebird'),
    followRedirects: false,
    timeout: 10000
});

function getNonForkRepo(page, _per_page) {
    const per_page = _per_page || 100;
    return new Promise((resolve, reject) => {
        github.repos.getAll({
            per_page,
            page
        }, function(err, res) {
            if (err) return reject(err);
            if (res.length == 0) return reject(new Error("EOF"));

            const repos = res.filter((repo) => {
                if (repo.permissions.admin == false) {
                    return false;
                }
                if (repo.fork) {
                    return false;
                }
                if (repo.private) {
                    return false;
                }
                return true;
            }).map((repo) => {
                return {
                    url: repo.url,
                    forks: repo.forks,
                    name: repo.name,
                    desc: repo.description,
                };
            });

            return resolve(repos);
        });
    });
}

function sortRepo(repos) {
    return repos.sort((a, b) => {
        return a.forks - b.forks;
    });
}

function main() {
    if (argv.help) {
        return help();
    }

    if (!argv.username || !argv.password) {
        return help();
    }

    const username = argv.username;
    const password = argv.password;
    const per_page = argv.per_page;
    let repos = [];

    github.authenticate({
        type: "basic",
        username: username,
        password: password,
    });

    co(function *() {
        for (let i = 1; i < 100; i++) {
            const repo = yield getNonForkRepo(i, per_page);
            repos = repos.concat(repo);
        }
        console.log(JSON.stringify(sortRepo(repos)));
    }).catch((err) => {
        console.log(JSON.stringify(sortRepo(repos)));
    })
}

main()
