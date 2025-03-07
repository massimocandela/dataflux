/*
 * MIT License
 *
 * Copyright (c) 2022 Massimo Candela <https://massimocandela.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import ObserverStore from "./ObserverStore";
import {v4 as uuidv4} from "uuid";

export default class ReactStore extends ObserverStore {
    constructor(options) {
        super(options);
    };

    syncState = (object, key, context) => {
        context.___obs_sync_state ??= {};
        if (context.___obs_sync_state && context.___obs_sync_state[key]) {
            this.unsubscribe(context.___obs_sync_state[key]);
            delete context.___obs_sync_state[key];
        }

        if (object) {
            if (object?.getParent) {
                const parent = object.getParent();
                context.___obs_sync_state[key] = this.findOne(parent.getModel().getType(), key, context, n => parent.getId() === n.getId() || parent.id === n.id);
            } else {
                context.___obs_sync_state[key] = this.findOne(object.getModel().getType(), key, context, n => object.getId() === n.getId() || object.id === n.id);
            }

            return context.___obs_sync_state[key];
        } else {
            context.setState({...context.state, [key]: null});
        }
    };

    didUpdate = (context) => {
        const objects = Object.values((context?.props ?? {})).filter(i => i?.isDataflux?.());

        objects.forEach(object => this.syncState(object, uuidv4(), context));
    };

    #addSubscriptionToContext = (context, subKey) => { // I know...
        context.___obs_subkeys ??= [];
        context.___obs_subkeys.push(subKey);
        context.___obs_unsubscribe_context = this;
        context.___obs_unsubscribe = () => {
            for (let key of context.___obs_subkeys || []) {
                context.___obs_unsubscribe_context.unsubscribe(key);
            }
        };
        context.componentWillUnmount = function () {
            context.___obs_unsubscribe();
        };
    };

    findAll(type, stateAttribute, context, filterFunction) {
        this.#fixState(stateAttribute, context, false);

        const subKey = this.subscribe(type, data => {
            if (context._isMounted === undefined || context._isMounted) {
                context.setState({
                    ...context.state,
                    [stateAttribute]: data || []
                });
            }
        }, filterFunction);

        this.#addSubscriptionToContext(context, subKey);

        return subKey;
    };

    findOne(type, stateAttribute, context, filterFunction) {
        this.#fixState(stateAttribute, context, true);

        const subKey = this.subscribe(type, data => {
            if (context._isMounted === undefined || context._isMounted) {
                context.setState({
                    ...context.state,
                    [stateAttribute]: data && data.length ? data[0] : null
                });
            }
        }, filterFunction);

        this.#addSubscriptionToContext(context, subKey);

        return subKey;
    };

    #fixState(stateAttribute, context, one) {
        if (!context[stateAttribute]) {
            context[stateAttribute] = one ? null : []; // side effect on state
        }
    }

    handleChange = (object, name, cast) => {
        return (event, rawValue) => {
            const value = event ? (event.target.type === "checkbox" ? event.target.checked : event.target.value) : "";
            const finalValue = value ?? rawValue;
            object.set(name, cast && finalValue != null ? cast(finalValue) : finalValue);
        };
    };

}
