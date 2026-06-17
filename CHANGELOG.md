# [1.8.0](https://github.com/MagmaMoose/git-pull-request-dashboard/compare/v1.7.1...v1.8.0) (2026-06-17)


### Features

* add table view for pull requests, default over cards ([9066287](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/906628753dfabb2b9acf6dfec90fea7c91309b3e))

## [1.7.1](https://github.com/MagmaMoose/git-pull-request-dashboard/compare/v1.7.0...v1.7.1) (2026-06-17)


### Bug Fixes

* **server:** rewrite proxied Link header so pagination stays authenticated ([59f5361](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/59f53610bacbaddf501887defdff40124119c1dc))

# [1.7.0](https://github.com/MagmaMoose/git-pull-request-dashboard/compare/v1.6.1...v1.7.0) (2026-06-17)


### Bug Fixes

* **k8s:** correctly suppress KICS + Checkov secret false positives ([3072984](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/3072984130e282393268bc3d005b47f68d211317))
* **k8s:** suppress KICS false-positive secret findings on ExternalSecret keys ([db1a841](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/db1a841b1b48268790100e4aae53cd908f7f2024))


### Features

* **k8s:** provision github-oauth secret from OCI Vault via ExternalSecret ([40fe6a6](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/40fe6a63a38623df978aab85cab9361d44b4bd66))

## [1.6.1](https://github.com/MagmaMoose/git-pull-request-dashboard/compare/v1.6.0...v1.6.1) (2026-06-17)


### Bug Fixes

* **k8s:** derive APP_VERSION from the image tag via kustomize replacements ([c367022](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/c36702217081766d5770a115604091f8f67ad5aa))

# [1.6.0](https://github.com/MagmaMoose/git-pull-request-dashboard/compare/v1.5.1...v1.6.0) (2026-06-17)


### Bug Fixes

* **k8s:** make APP_VERSION patch a JSON 6902 op, not a partial Deployment ([9ca09c9](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/9ca09c9acdd10b24ae8093bf95227614020c2ff0))


### Features

* runtime version chip, OAuth auto-login, and session-unseal fix ([fa74389](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/fa74389c04f778f9e01be9dfa7d327352f1b0695))

## [1.5.1](https://github.com/MagmaMoose/git-pull-request-dashboard/compare/v1.5.0...v1.5.1) (2026-06-17)


### Bug Fixes

* **k8s:** suppress KICS Container-Running-With-Low-UID ([983559e](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/983559efd9dbbb8a95bfe36baa727391815cba1d))
* **server:** harden parseCookies against remote property injection ([e9c47ec](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/e9c47ec316667f0b15a15ed395dc12edfbd11154))
* **server:** validate cookie names before using them as keys ([64862fc](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/64862fc0f2cdf6fe4a1e2c0708e642590b420845))
* **server:** validate provider host and harden session-map writes ([fe07505](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/fe0750532b99b0df4412aa4accca9dff31bb35ab))
* **settings:** migrate legacy repository-settings keys on load ([9f10e14](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/9f10e144d8377b25fb9b077eaed229ddf2976e9a))

# [1.5.0](https://github.com/MagmaMoose/git-pull-request-dashboard/compare/v1.4.0...v1.5.0) (2026-06-17)


### Bug Fixes

* update diatreme action to use latest version ([615b5dc](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/615b5dc1cd73df70d034b27375bb6c99fccf0481))


### Features

* add manual release workflow with version override input ([db72cbf](https://github.com/MagmaMoose/git-pull-request-dashboard/commit/db72cbf24f03fe39cd7c9238b057a87644b9ae63))
