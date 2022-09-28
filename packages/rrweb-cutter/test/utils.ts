import { assertSnapshot as originalAssertSnapshot } from 'rrweb/test/utils';
import { eventWithTime } from 'rrweb/typings/types';
export function assertSnapshot(events: eventWithTime[]) {
  /**
   * for some reason there seems to be an inconsistency between
   * import("rrweb/packages/rrweb/typings/types")
   * and import("rrweb/packages/rrweb/src/types")
   * which spawns the following error:
   * Type 'incrementalSnapshotEvent & { timestamp: number; delay?: number | undefined; }' is not assignable to type 'incrementalSnapshotEvent'.
   * @see https://ts-error-translator.vercel.app/?error=IIJw5grgtgpgdgFwAQHsBmSEE8AOMkDkAllDiiAgBQBEA9AKoDOMIjtAVhIwkXLSDDJsQIAO4wARrRwBDAMYBrGWBjCxk2thy8wbLauoBKAHQwAbvAQB1IggAWAFRIwA2gF0CSIoyRwUyGUZGIjA4GQkAG3wEFCRZEBlYBBZUDH1CEjIKGgZmVg4uHj4BIX51KVlFZVUy8SlGEDlNXAMTc0sbeydYdwJjACgkJAcWjNJyKjomFjZObl5+QRQ1Oul5JRUVjS0dPRbGI1MLRE7HZ09vX38kQODQ8KjMWPTiceypvNnChZLl2o1KhsaiJVg0mvoDm1jtZbGdYH1BkNhqNiHA5AJYIgZBEAMphHCMOz+ACi0KQADIkABvTDObiJHAALl80AkLAA3EgACYwCIyLAAfmZcFZKQAPkgIHAeWheDAuZyAL4XHx+AJBEJhSLRZ4o9onWHdGAIpFIkZ4MZZSa5GYFebFJZbCrrapO5raOC6d2tYy8dEwTEIbF4mQEokIUmWCnU2mwemkYWikCcnl8wWJqBskBICVSmVyhVIZVeVXXW6ah46zAozITHLTfJzIqLUoggEuzb-eqNb2Q31ojGWYP4wkksmUmk8ONBhMszMc7m8-lCudZnOS6UwWVweVKk2ms01gcBoe4kfhyOIaOTukzpmrhep5cZte5zfb3dFlVXdV3LWPGJqwtVF-UDYdQ1HCNoX3A9DzwHx0DiEAUDwCgsEILkZCDTwZAELw0RQUgsKIbUBlg2DzXwV4rXrT47WbX43UBV0u3dXZe0OP1ByxCIABEsJkb81RuDV7m1J4gKo2t3htRtvgdVtyjWKpOzbbtwX2TjjzAviBJg8jTUowhYC5IgZAASUQFh5B4FA4H47CSx-ES-0rCSXi4k8eIcwSyIM8ijOousPltJsfkdVjmNUpSdk9PZ4MOEyzMs5IEjkWz7L0pzhPLMSAN1YDpOtBsvntFs-jU5SgTdMEOJMJKLKstKMp8-T-IPQKGpS6z0qIOzWuystRP-KsXi6pqbL6uAAAVcMSNr2o6-ZUiQlCWGwQh9BwvC-UI2QeFIxFFv8wKito0L5PKpiO2BGLcHYiFDgAWXlZKJt6uzGCEobXPEwCPLeYq6LChSKqUqLbtBHtHpMF7TMa1LJs+vogA
   * disabling the type check for now
   */
  // @ts-ignore
  originalAssertSnapshot(events);
}
