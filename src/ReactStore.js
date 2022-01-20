import ObserverStore from "./ObserverStore";

const addSubscriptionToContext = (context, subKey) => { // I know...
    context.___obs_subkeys = context.___obs_subkeys || [];
    context.___obs_subkeys.push(subKey);
    context.___obs_unsubscribe = () => {
        for (let key of context.___obs_subkeys || []) {
            this.unsubscribe(key);
        }
    }
    context.componentWillUnmount = function () {
        context.___obs_unsubscribe();
    }
}

export default class ReactStore extends ObserverStore {
    constructor(options) {
        super(options);

    };

    findAll(type, stateAttribute, context, filterFunction) {
        this.#fixState(stateAttribute, context);

        const subKey = this.subscribe(type, data => {
            context.setState({
                ...context.state,
                [stateAttribute]: data || []
            });
        }, filterFunction);

        addSubscriptionToContext(context, subKey);
    };

    findOne(type, stateAttribute, context, filterFunction) {
        this.#fixState(stateAttribute, context);

        const subKey = this.subscribe(type, data => {
            context.setState({
                ...context.state,
                [stateAttribute]: data && data.length ? data[0] : null
            });
        }, filterFunction);

        addSubscriptionToContext(context, subKey);
    };

    #fixState (stateAttribute, context) {
        if (!context[stateAttribute]) {
            context[stateAttribute] = []; // side effect on state
        }
    }

    handleChange = (object, name) => {

        return (event, rawValue) => {
            const value = event ? (event.target.type === "checkbox" ? event.target.checked : event.target.value) : "";
            object.set(name, value || rawValue || "");
        }
    };

}
