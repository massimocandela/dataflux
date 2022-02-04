import ObserverStore from "./ObserverStore";

export default class ReactStore extends ObserverStore {
    constructor(options) {
        super(options);
    };

    #addSubscriptionToContext = (context, subKey) => { // I know...
        context.___obs_subkeys = context.___obs_subkeys || [];
        context.___obs_subkeys.push(subKey);
        context.___obs_unsubscribe_context = this;
        context.___obs_unsubscribe = () => {
            for (let key of context.___obs_subkeys || []) {
                context.___obs_unsubscribe_context.unsubscribe(key);
            }
        }
        context.componentWillUnmount = function () {
            context.___obs_unsubscribe();
        }
    }

    findAll(type, stateAttribute, context, filterFunction) {
        this.#fixState(stateAttribute, context, false);

        const subKey = this.subscribe(type, data => {
            context.setState({
                ...context.state,
                [stateAttribute]: data || []
            });
        }, filterFunction);

        this.#addSubscriptionToContext(context, subKey);
    };

    findOne(type, stateAttribute, context, filterFunction) {
        this.#fixState(stateAttribute, context, true);

        const subKey = this.subscribe(type, data => {
            context.setState({
                ...context.state,
                [stateAttribute]: data && data.length ? data[0] : null
            });
        }, filterFunction);

        this.#addSubscriptionToContext(context, subKey);
    };

    #fixState (stateAttribute, context, one) {
        if (!context[stateAttribute]) {
            context[stateAttribute] = one ? null : []; // side effect on state
        }
    }

    handleChange = (object, name) => {
        return (event, rawValue) => {
            const value = event ? (event.target.type === "checkbox" ? event.target.checked : event.target.value) : "";
            object.set(name, value ?? rawValue ?? "");
        }
    };

}
