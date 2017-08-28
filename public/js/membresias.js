$(document).ready(function () {
  $('#form').on('submit', (e) => {
    e.preventDefault()
    let json = monaco.editor.getModels()[1].getValue()

    $.ajax({
      url: location.href,
      type: 'PUT',
      data: {
        esquema: json
      }
    })
      .done(response => console.log(response))
      .fail(error => console.log(error));
  })
});