function Exercise( data )
{
    let defaults = {
        name: "Default",
        description: "Workout",
        media: "",
    };


    Object.merge(defaults, data);
    Object.merge(this, defaults);

}

function Progression()
{
    this.name = "Progression";
    this.exercises = [];
}


function Set()
{
    this.reps = 10;
    this.time = 100;
}
