module Cookies {
    const DAYS2MS: number = 864e5
    /**
     * Sets cookies
     * @param name cookie name
     * @param value cookie value
     * @param expires days to expire
     */
    export function set(name: string, value: string, expires?: number) {
        if (document == null)
            return;
        let cookie = `${name}=${value};path=/`;
        if (expires != null)
            cookie += `;expires=${new Date(Date.now() + expires * DAYS2MS).toUTCString()}`;
        document.cookie = cookie;
    }

    /**
     * Gets cookie
     * @param name cookie name
     * @returns cookie value
     */
    export function get(name: string): string {
        if (document == null)
            return;
        const cookies = document.cookie.split(";");
        const item = cookies.find(item => item.trim().startsWith(name));
        if (item == null)
            return "";
        return item.trim().slice(name.length + 1);
    }

    /**
     * Removes cookie
     * @param name cookie name
     */
    export function remove(name: string) {
        set(name, "", -1);
    }
}