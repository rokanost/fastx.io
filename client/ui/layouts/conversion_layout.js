Template.conversionLayout.helpers({
    steps() {
        return [
            {index: 1, class: "complete"},
            {index: 2, class: (this.status_id >= 3 ? "complete" : "active")},
            {index: 3, class: (this.status_id >= 3 ? "complete" : "disabled")}
        ]
    }
})