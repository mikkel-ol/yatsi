# Keep runtime state in one YATSI server instance

The first release stores active tunnels, delegated grants, and revocation state in memory within one YATSI server process. Workshop scale does not justify distributed coordination yet; multiple replicas, shared state, and non-sticky routing are unsupported until horizontal scaling becomes a real requirement.
